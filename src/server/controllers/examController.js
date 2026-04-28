import { db } from "#shared/config/db.js";
import { runCoreExecution } from "#shared/services/sqlDataQueries.js";

// HELPERS

function normalizeRows(rows) {
  if (!rows || rows.length === 0) return [];
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, v === null ? null : String(v)]),
    ),
  );
}

/**
 * Deep-compare two result sets regardless of column order.
 * Returns true if every row in expected appears in actual (and counts match).
 */
function resultsMatch(actual, expected, orderMatters) {
  const norm = (rows) =>
    rows.map((r) => {
      const sorted = Object.keys(r)
        .sort()
        .reduce((acc, k) => {
          acc[k] = r[k] === null ? "" : String(r[k]).trim().toLowerCase();
          return acc;
        }, {});
      return JSON.stringify(sorted);
    });

  const actualNorm = norm(actual);
  const expectedNorm = norm(expected);

  if (actualNorm.length !== expectedNorm.length) return false;

  if (orderMatters) {
    return actualNorm.every((r, i) => r === expectedNorm[i]);
  }

  const sortedActual = [...actualNorm].sort();
  const sortedExpected = [...expectedNorm].sort();
  return sortedActual.every((r, i) => r === sortedExpected[i]);
}

function calcLevel(xp) {
  let level = 1,
    threshold = 0;
  while (true) {
    const next = threshold + level * 100;
    if (xp < next) return level;
    threshold = next;
    level++;
    if (level > 99) return 100;
  }
}

// BADGE CRITERIA CHECKER

async function checkAndAwardBadges(client, userId, context) {
  const { examPassed, certEarned, scorePercent, totalExams, xp } = context;
  const newBadges = [];

  try {
    const { rows: allBadges } = await client.query(
      `SELECT * FROM badges WHERE is_active = true`,
    );
    const { rows: existing } = await client.query(
      `SELECT badge_id FROM user_badges WHERE user_id = $1`,
      [userId],
    );
    const ownedIds = new Set(existing.map((r) => r.badge_id));

    for (const badge of allBadges) {
      if (ownedIds.has(badge.id)) continue;

      const criteria = badge.criteria_json || {};
      let earned = false;

      if (criteria.type === "exam_pass" && examPassed) earned = true;
      if (criteria.type === "cert_earn" && certEarned) earned = true;
      if (
        criteria.type === "exam_score" &&
        scorePercent >= (criteria.min_score || 100)
      )
        earned = true;
      if (criteria.type === "exam_count" && totalExams >= (criteria.count || 1))
        earned = true;
      if (criteria.type === "xp_milestone" && xp >= (criteria.threshold || 0))
        earned = true;

      if (earned) {
        await client.query(
          `INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, badge.id],
        );
        newBadges.push({
          id: badge.id,
          name: badge.name,
          code: badge.code,
          xp_reward: badge.xp_reward,
        });
      }
    }
  } catch (err) {
    console.error("Badge check error:", err.message);
  }

  return newBadges;
}

// GRADE SQL QUESTION

async function gradeSqlQuestion(question, userSql, dialect) {
  if (!userSql?.trim())
    return {
      is_correct: false,
      execution_time_ms: 0,
      error: "No SQL provided",
    };

  const solutionSqls =
    question.sql_variants?.solution?.[dialect] ||
    question.sql_variants?.solution?.["universal"] ||
    [];

  if (!solutionSqls.length)
    return {
      is_correct: false,
      execution_time_ms: 0,
      error: "No solution to compare",
    };

  try {
    const start = Date.now();
    const userResult = await runCoreExecution(userSql, dialect);
    const execution_time_ms = Date.now() - start;
    const userRows = normalizeRows(userResult?.rows || []);

    for (const solSql of solutionSqls) {
      const solResult = await runCoreExecution(solSql, dialect);
      const solRows = normalizeRows(solResult?.rows || []);
      const orderMatters = question.sql_variants?.order_matters ?? false;
      if (resultsMatch(userRows, solRows, orderMatters)) {
        return { is_correct: true, execution_time_ms };
      }
    }

    return { is_correct: false, execution_time_ms };
  } catch (err) {
    return { is_correct: false, execution_time_ms: 0, error: err.message };
  }
}

// SUBMIT EXAM

/**
 * POST /api/exam/submit
 * Body: {
 *   examId: number,
 *   dialect: string,
 *   timedOut?: boolean,
 *   answers: {
 *     [questionId]: {
 *       type: "multiple_choice" | "sql",
 *       selectedChoiceIds?: number[],   // array for multi-select
 *       sqlAnswer?: string
 *     }
 *   }
 * }
 */
export const submitExam = async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const {
    examId,
    dialect = "mysql",
    timedOut = false,
    answers = {},
  } = req.body;
  if (!examId) return res.status(400).json({ error: "examId is required" });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    //  Load exam + questions
    const { rows: examRows } = await client.query(
      `SELECT te.*, t.title AS track_title 
       FROM track_exams te JOIN tracks t ON t.id = te.track_id 
       WHERE te.id = $1 AND te.is_published = true`,
      [examId],
    );
    if (!examRows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Exam not found" });
    }
    const exam = examRows[0];

    const { rows: questions } = await client.query(
      `SELECT eq.*, 
        json_agg(
          json_build_object(
            'id', ec.id, 'choice_text', ec.choice_text,
            'is_correct', ec.is_correct, 'choice_order', ec.choice_order
          ) ORDER BY ec.choice_order
        ) FILTER (WHERE ec.id IS NOT NULL) AS choices
       FROM exam_questions eq
       LEFT JOIN exam_choices ec ON ec.question_id = eq.id
       WHERE eq.exam_id = $1
       GROUP BY eq.id
       ORDER BY eq.question_order`,
      [examId],
    );

    // Load sql_variants for SQL questions (linked via problem or inline)
    const sqlQuestions = questions.filter(
      (q) => q.question_type === "sql" && q.linked_problem_id,
    );
    const problemIds = [
      ...new Set(sqlQuestions.map((q) => q.linked_problem_id)),
    ];

    const sqlVariantsMap = {};
    if (problemIds.length) {
      const { rows: variants } = await client.query(
        `SELECT psv.problem_id, psv.variant_type, psv.dialect, psv.sql_text, psv.sort_order, p.order_matters
         FROM problem_sql_variants psv
         JOIN problems p ON p.id = psv.problem_id
         WHERE psv.problem_id = ANY($1)
         ORDER BY psv.sort_order`,
        [problemIds],
      );
      for (const v of variants) {
        if (!sqlVariantsMap[v.problem_id]) {
          sqlVariantsMap[v.problem_id] = {
            starter: {},
            solution: {},
            schema: {},
            order_matters: v.order_matters,
          };
        }
        if (v.variant_type === "solution") {
          if (!sqlVariantsMap[v.problem_id].solution[v.dialect]) {
            sqlVariantsMap[v.problem_id].solution[v.dialect] = [];
          }
          sqlVariantsMap[v.problem_id].solution[v.dialect].push(v.sql_text);
        } else {
          sqlVariantsMap[v.problem_id][v.variant_type][v.dialect] = v.sql_text;
        }
      }
    }

    // Attach sql_variants to questions
    for (const q of questions) {
      if (q.question_type === "sql" && q.linked_problem_id) {
        q.sql_variants = sqlVariantsMap[q.linked_problem_id] || null;
      }
    }

    //  Create submission record
    const { rows: submRows } = await client.query(
      `INSERT INTO track_exam_submissions 
        (exam_id, user_id, submitted_at, timed_out, engine)
       VALUES ($1, $2, NOW(), $3, $4)
       RETURNING id`,
      [examId, userId, timedOut, dialect],
    );
    const submissionId = submRows[0].id;

    //  Grade each question
    let totalEarned = 0;
    const gradedAnswers = [];

    for (const q of questions) {
      const userAnswer = answers[q.id];
      let isCorrect = false;
      let pointsEarned = 0;
      let selectedChoiceId = null;
      let sqlAnswer = null;

      if (q.question_type === "multiple_choice") {
        const correctChoiceIds = (q.choices || [])
          .filter((c) => c.is_correct)
          .map((c) => c.id);

        const userSelected = userAnswer?.selectedChoiceIds || [];

        // Must select ALL correct choices and ONLY correct choices
        const selectedSet = new Set(userSelected);
        const correctSet = new Set(correctChoiceIds);
        isCorrect =
          selectedSet.size === correctSet.size &&
          [...selectedSet].every((id) => correctSet.has(id));

        // Store first selected for legacy single-select field
        selectedChoiceId = userSelected[0] || null;
        pointsEarned = isCorrect ? q.points : 0;
      } else if (q.question_type === "sql") {
        sqlAnswer = userAnswer?.sqlAnswer || "";
        const gradeResult = await gradeSqlQuestion(q, sqlAnswer, dialect);
        isCorrect = gradeResult.is_correct;
        pointsEarned = isCorrect ? q.points : 0;
      }

      totalEarned += pointsEarned;

      await client.query(
        `INSERT INTO user_exam_question_answers 
          (submission_id, question_id, selected_choice, sql_answer, is_correct, points_earned)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          submissionId,
          q.id,
          selectedChoiceId,
          sqlAnswer,
          isCorrect,
          pointsEarned,
        ],
      );

      gradedAnswers.push({ questionId: q.id, isCorrect, pointsEarned });
    }

    //  Calculate score
    const totalPoints =
      exam.total_points || questions.reduce((s, q) => s + q.points, 0);
    const scorePercent =
      totalPoints > 0
        ? Math.round((totalEarned / totalPoints) * 100 * 100) / 100
        : 0;
    const passed = scorePercent >= exam.pass_threshold;
    const certEligible = scorePercent >= exam.cert_threshold;

    await client.query(
      `UPDATE track_exam_submissions 
       SET score = $1, score_percent = $2, passed = $3, cert_eligible = $4,
           answers_json = $5
       WHERE id = $6`,
      [
        totalEarned,
        scorePercent,
        passed,
        certEligible,
        JSON.stringify({ answers: gradedAnswers }),
        submissionId,
      ],
    );

    //  Award certificate if eligible
    let certUuid = null;
    if (certEligible) {
      const { rows: certRows } = await client.query(
        `INSERT INTO certificates (user_id, exam_id, score_percent)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING
         RETURNING cert_uuid`,
        [userId, examId, scorePercent],
      );
      certUuid = certRows[0]?.cert_uuid || null;
    }

    //  Update user XP if passed
    let xpGained = 0;
    let newXp = 0;
    let newLevel = 1;

    if (passed) {
      // Base XP: proportional to score, max 200 for a full exam
      xpGained = Math.round((scorePercent / 100) * 200);

      const { rows: userRows } = await client.query(
        `UPDATE users SET xp = xp + $1 WHERE id = $2 RETURNING xp`,
        [xpGained, userId],
      );
      newXp = userRows[0]?.xp || 0;
      newLevel = calcLevel(newXp);

      await client.query(`UPDATE users SET level = $1 WHERE id = $2`, [
        newLevel,
        userId,
      ]);

      // Update streak
      await client.query(
        `UPDATE users SET
           current_streak = CASE
             WHEN last_solved_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
             WHEN last_solved_date = CURRENT_DATE THEN current_streak
             ELSE 1
           END,
           longest_streak = GREATEST(
             longest_streak,
             CASE
               WHEN last_solved_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
               WHEN last_solved_date = CURRENT_DATE THEN current_streak
               ELSE 1
             END
           ),
           last_solved_date = CURRENT_DATE
         WHERE id = $1`,
        [userId],
      );
    }

    //  Check badge criteria
    const {
      rows: [{ count: totalExamsCount }],
    } = await client.query(
      `SELECT COUNT(*) AS count FROM track_exam_submissions WHERE user_id = $1 AND passed = true`,
      [userId],
    );

    const newBadges = await checkAndAwardBadges(client, userId, {
      examPassed: passed,
      certEarned: !!certUuid,
      scorePercent,
      totalExams: parseInt(totalExamsCount),
      xp: newXp,
    });

    // Bonus XP from badges
    if (newBadges.length) {
      const badgeXp = newBadges.reduce((s, b) => s + (b.xp_reward || 0), 0);
      if (badgeXp > 0) {
        await client.query(`UPDATE users SET xp = xp + $1 WHERE id = $2`, [
          badgeXp,
          userId,
        ]);
        xpGained += badgeXp;
        newXp += badgeXp;
      }
    }

    await client.query("COMMIT");

    return res.json({
      status: "success",
      data: {
        submissionId,
        score: totalEarned,
        totalPoints,
        scorePercent,
        passed,
        certEligible,
        certUuid,
        xpGained,
        newXp,
        newLevel,
        newBadges,
        gradedAnswers,
        // Tell frontend which questions were correct/wrong
        questionResults: gradedAnswers.reduce((acc, a) => {
          acc[a.questionId] = {
            isCorrect: a.isCorrect,
            pointsEarned: a.pointsEarned,
          };
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Exam submission error:", err);
    return res.status(500).json({ error: err.message || "Submission failed" });
  } finally {
    client.release();
  }
};
