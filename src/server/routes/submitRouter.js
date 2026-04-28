/**
 * submitRouter.js — POST /api/submit
 *
 * FIXES:
 *  [1] solution_views: uses ON CONFLICT (user_id, problem_id) column syntax
 *      instead of named constraint (avoids needing ALTER TABLE migration).
 *  [2] Lesson-without-problem returns 404 cleanly.
 *  [3] user_lesson_progress: correctly handles lessons that have problems
 *      (marks completed on first correct solve of the problem).
 *  [4] Always returns new_xp / new_level / xp_delta (even on exec error).
 *  [5] Wrong answer → xp_delta: 0 (never undefined).
 *  [6] applyUserRewards streak only incremented on FIRST correct solve.
 *  [7] req.user.userId used consistently.
 */

import { Router } from "express";
import { db } from "#shared/config/db.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";
import { runCoreExecution } from "#shared/services/sqlDataQueries.js";

const router = new Router();
router.use(authenticateToken);

// ─── constants ────────────────────────────────────────────────────────────────
const TIMEOUT_XP_PENALTY = 50;

// ─── helpers ──────────────────────────────────────────────────────────────────
function normaliseRows(rows, orderMatters) {
  const norm = (rows ?? []).map((row) => {
    const sorted = {};
    for (const k of Object.keys(row).sort()) sorted[k] = String(row[k] ?? "");
    return JSON.stringify(sorted);
  });
  if (!orderMatters) norm.sort();
  return norm.join("|");
}

async function runUserSql(sql, engine) {
  const start = Date.now();
  try {
    const result = await runCoreExecution(sql, engine);
    return {
      rows: result?.rows ?? [],
      columns: result?.columns ?? [],
      executionMs: Date.now() - start,
      error: null,
    };
  } catch (err) {
    return {
      rows: [],
      columns: [],
      executionMs: Date.now() - start,
      error: err.message ?? "Execution error",
    };
  }
}

async function checkCorrectness(userRows, problem, engine) {
  const varRes = await db.query(
    `SELECT sql_text, order_matters
     FROM problem_sql_variants
     WHERE problem_id = $1
       AND variant_type = 'solution'
       AND (dialect = $2::sql_dialect OR dialect = 'universal')
     ORDER BY CASE WHEN dialect = $2::sql_dialect THEN 0 ELSE 1 END, sort_order`,
    [problem.id, engine],
  );
  if (!varRes.rows.length) return false;

  const orderMatters = problem.order_matters ?? false;
  const userNorm = normaliseRows(userRows, orderMatters);

  for (const { sql_text, order_matters } of varRes.rows) {
    const om = order_matters ?? orderMatters;
    try {
      const solResult = await runCoreExecution(sql_text, engine);
      if (userNorm === normaliseRows(solResult?.rows ?? [], om)) return true;
    } catch {
      /* skip broken reference solution */
    }
  }
  return false;
}

function computeLevel(xp) {
  let level = 1,
    threshold = 0;
  while (true) {
    const next = threshold + level * 100;
    if (xp < next) return { level, xp };
    threshold = next;
    level++;
    if (level >= 100) return { level: 100, xp };
  }
}

async function applyUserRewards(client, userId, xpDelta, alreadySolved) {
  const userRes = await client.query(
    `SELECT xp, level, current_streak, longest_streak, last_solved_date
     FROM users WHERE id = $1 FOR UPDATE`,
    [userId],
  );
  const user = userRes.rows[0];
  if (!user) throw new Error(`User ${userId} not found`);

  const today = new Date().toISOString().slice(0, 10);
  const lastDate = user.last_solved_date
    ? new Date(user.last_solved_date).toISOString().slice(0, 10)
    : null;

  const rawXp = (user.xp ?? 0) + xpDelta;
  const newXp = Math.max(0, rawXp);
  const { level: newLevel } = computeLevel(newXp);

  let newStreak = user.current_streak ?? 0;
  let newLongest = user.longest_streak ?? 0;

  // Only update streak on FIRST correct solve
  if (xpDelta > 0 && !alreadySolved) {
    if (lastDate === null) {
      newStreak = 1;
    } else {
      const diffDays = Math.round(
        (new Date(today) - new Date(lastDate)) / 86400000,
      );
      if (diffDays === 1) newStreak += 1;
      else if (diffDays > 1) newStreak = 1;
      // diffDays === 0 → already solved today, keep streak
    }
    newLongest = Math.max(newLongest, newStreak);
  }

  await client.query(
    `UPDATE users
     SET xp = $1, level = $2,
         current_streak = $3, longest_streak = $4,
         last_solved_date = CASE WHEN $5 > 0 AND NOT $6 THEN $7::date ELSE last_solved_date END
     WHERE id = $8`,
    [
      newXp,
      newLevel,
      newStreak,
      newLongest,
      xpDelta,
      alreadySolved,
      today,
      userId,
    ],
  );

  return { newXp, newLevel, newStreak };
}

async function evaluateBadges(
  client,
  userId,
  { newXp, newLevel, newStreak, problemId, difficulty },
) {
  const eligibleRes = await client.query(
    `SELECT b.id, b.name, b.code, b.xp_reward, b.criteria_json
     FROM badges b
     WHERE b.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM user_badges ub WHERE ub.user_id = $1 AND ub.badge_id = b.id
       )`,
    [userId],
  );

  const solvedRes = await client.query(
    `SELECT COUNT(*) AS cnt FROM user_problem_state
     WHERE user_id = $1 AND is_solved = true`,
    [userId],
  );
  const solvedCount = Number(solvedRes.rows[0]?.cnt ?? 0);

  const earned = [];
  let accumulatedXp = newXp;

  for (const badge of eligibleRes.rows) {
    const c = badge.criteria_json;
    if (!c) continue;

    let qualifies = true;
    if (
      c.min_problems_solved !== undefined &&
      solvedCount < c.min_problems_solved
    )
      qualifies = false;
    if (c.min_xp !== undefined && accumulatedXp < c.min_xp) qualifies = false;
    if (c.min_streak !== undefined && newStreak < c.min_streak)
      qualifies = false;
    if (
      c.specific_problem_id !== undefined &&
      problemId !== c.specific_problem_id
    )
      qualifies = false;
    if (
      c.difficulty !== undefined &&
      difficulty?.toLowerCase() !== c.difficulty
    )
      qualifies = false;

    if (qualifies) {
      await client.query(
        `INSERT INTO user_badges (user_id, badge_id, earned_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT DO NOTHING`,
        [userId, badge.id],
      );
      earned.push({
        id: badge.id,
        name: badge.name,
        code: badge.code,
        xp_reward: badge.xp_reward,
      });

      if (badge.xp_reward > 0) {
        accumulatedXp += badge.xp_reward;
        const { level: recomputedLevel } = computeLevel(
          Math.max(0, accumulatedXp),
        );
        await client.query(
          `UPDATE users
           SET xp = GREATEST(0, xp + $1), level = $2
           WHERE id = $3`,
          [badge.xp_reward, recomputedLevel, userId],
        );
      }
    }
  }
  return { earned, finalXp: accumulatedXp };
}

// ─── main route ───────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  const {
    type,
    id,
    engine,
    sql,
    timed_out = false,
    solution_viewed = false,
  } = req.body;

  if (!type || !["lesson", "problem"].includes(type))
    return res.status(400).json({
      status: "error",
      message: "'type' must be 'lesson' or 'problem'",
    });
  const numId = Number(id);
  if (!numId || isNaN(numId))
    return res
      .status(400)
      .json({ status: "error", message: "'id' must be a positive integer" });
  if (!engine || !["mysql", "postgres", "sqlite"].includes(engine))
    return res.status(400).json({
      status: "error",
      message: "'engine' must be mysql, postgres, or sqlite",
    });
  if (typeof sql !== "string" || !sql.trim())
    return res
      .status(400)
      .json({ status: "error", message: "'sql' is required" });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // ── 1. Resolve problem ────────────────────────────────────────────────────
    let problem;
    let lessonId = null;

    if (type === "lesson") {
      lessonId = numId;
      // FIX: A lesson may have no problem (pure reading lesson). Return 404.
      const pRes = await client.query(
        `SELECT p.*
         FROM problems p
         WHERE p.lesson_id = $1
           AND p.is_standalone = false
           AND p.is_published = true
         LIMIT 1`,
        [lessonId],
      );
      if (!pRes.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "error",
          message: "This lesson has no problem to submit",
        });
      }
      problem = pRes.rows[0];
    } else {
      // type === "problem"
      const pRes = await client.query(
        `SELECT *
         FROM problems
         WHERE id = $1
           AND is_standalone = true
           AND is_published = true`,
        [numId],
      );
      if (!pRes.rows.length) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ status: "error", message: "Problem not found" });
      }
      problem = pRes.rows[0];
    }

    // ── 2. Run user SQL ───────────────────────────────────────────────────────
    const {
      rows: userRows,
      columns,
      executionMs,
      error: execError,
    } = await runUserSql(sql, engine);

    // ── 3. Grade ──────────────────────────────────────────────────────────────
    let isCorrect = false;
    if (!execError && !timed_out) {
      isCorrect = await checkCorrectness(userRows, problem, engine);
    }

    // ── 4. Record submission ──────────────────────────────────────────────────
    const subRes = await client.query(
      `INSERT INTO submissions
         (user_id, problem_id, submitted_sql, is_correct, execution_time_ms, engine)
       VALUES ($1, $2, $3, $4, $5, $6::sql_dialect)
       RETURNING id`,
      [userId, problem.id, sql, isCorrect, executionMs, engine],
    );
    const submissionId = subRes.rows[0].id;

    // ── 5. Record solution view ───────────────────────────────────────────────
    // FIX: Use (user_id, problem_id) column-list conflict target instead of a
    // named constraint. This works with or without an explicit UNIQUE constraint
    // name, as long as the underlying unique index exists.
    // Run this migration once if needed:
    //   ALTER TABLE solution_views ADD UNIQUE (user_id, problem_id);
    if (solution_viewed) {
      await client.query(
        `INSERT INTO solution_views (user_id, problem_id, viewed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, problem_id)
         DO UPDATE SET viewed_at = NOW()`,
        [userId, problem.id],
      );
    }

    // ── 6. Upsert user_problem_state ──────────────────────────────────────────
    const stateRes = await client.query(
      `SELECT is_solved, attempts
       FROM user_problem_state
       WHERE user_id = $1 AND problem_id = $2`,
      [userId, problem.id],
    );
    const alreadySolved = stateRes.rows[0]?.is_solved ?? false;
    const newAttempts = (stateRes.rows[0]?.attempts ?? 0) + 1;

    if (!stateRes.rows.length) {
      await client.query(
        `INSERT INTO user_problem_state
           (user_id, problem_id, attempts, is_solved, first_attempt_at, solved_at)
         VALUES ($1, $2, 1, $3, NOW(), $4)`,
        [userId, problem.id, isCorrect, isCorrect ? new Date() : null],
      );
    } else {
      await client.query(
        `UPDATE user_problem_state
         SET attempts  = $1,
             is_solved = is_solved OR $2,
             solved_at = CASE WHEN $2 AND NOT is_solved THEN NOW() ELSE solved_at END
         WHERE user_id = $3 AND problem_id = $4`,
        [newAttempts, isCorrect, userId, problem.id],
      );
    }

    // ── 7. Mark lesson complete on first correct solve ────────────────────────
    // FIX: lessonId is set for type=lesson. For type=problem we also check
    // whether the problem belongs to a lesson (lesson_id FK on problems table).
    let lessonCompleted = false;
    const effectiveLessonId = lessonId ?? problem.lesson_id ?? null;

    if (effectiveLessonId && isCorrect && !alreadySolved) {
      const lpRes = await client.query(
        `SELECT completed
         FROM user_lesson_progress
         WHERE user_id = $1 AND lesson_id = $2`,
        [userId, effectiveLessonId],
      );
      if (!lpRes.rows.length) {
        await client.query(
          `INSERT INTO user_lesson_progress
             (user_id, lesson_id, completed, completed_at, updated_at)
           VALUES ($1, $2, true, NOW(), NOW())`,
          [userId, effectiveLessonId],
        );
        lessonCompleted = true;
      } else if (!lpRes.rows[0].completed) {
        await client.query(
          `UPDATE user_lesson_progress
           SET completed = true, completed_at = NOW(), updated_at = NOW()
           WHERE user_id = $1 AND lesson_id = $2`,
          [userId, effectiveLessonId],
        );
        lessonCompleted = true;
      }
    }

    // ── 8. Update track progress ──────────────────────────────────────────────
    let trackCompleted = false;
    if (isCorrect && !alreadySolved) {
      // Resolve the track via the lesson (whether we arrived via lesson or problem)
      const trackIdRes = await client.query(
        `SELECT l.track_id
         FROM lessons l
         WHERE l.id = $1`,
        [effectiveLessonId],
      );
      const trackId = trackIdRes.rows[0]?.track_id ?? null;

      if (trackId) {
        await client.query(
          `INSERT INTO user_track_progress
             (user_id, track_id, completed_problems, total_problems, updated_at)
           SELECT
             $1,
             $2,
             (
               SELECT COUNT(*)
               FROM user_problem_state ups
               JOIN problems p ON p.id = ups.problem_id
               JOIN lessons l ON l.id = p.lesson_id
               WHERE ups.user_id = $1
                 AND ups.is_solved = true
                 AND l.track_id = $2
             ),
             (
               SELECT COUNT(*)
               FROM problems p
               JOIN lessons l ON l.id = p.lesson_id
               WHERE p.is_published = true
                 AND l.track_id = $2
             ),
             NOW()
           ON CONFLICT (user_id, track_id) DO UPDATE
             SET completed_problems = EXCLUDED.completed_problems,
                 total_problems     = EXCLUDED.total_problems,
                 updated_at         = NOW()`,
          [userId, trackId],
        );

        const tpRes = await client.query(
          `SELECT completed_problems, total_problems
           FROM user_track_progress
           WHERE user_id = $1 AND track_id = $2`,
          [userId, trackId],
        );
        const tp = tpRes.rows[0];
        if (
          tp &&
          Number(tp.total_problems) > 0 &&
          Number(tp.completed_problems) >= Number(tp.total_problems)
        ) {
          await client.query(
            `UPDATE user_track_progress
             SET completed = true
             WHERE user_id = $1 AND track_id = $2`,
            [userId, trackId],
          );
          trackCompleted = true;
        }
      }
    }

    // ── 9. Compute XP delta ───────────────────────────────────────────────────
    // xpDelta is always a number; 0 for wrong/already-solved.
    let xpDelta = 0;
    if (timed_out) {
      xpDelta = -TIMEOUT_XP_PENALTY;
    } else if (isCorrect && !alreadySolved) {
      xpDelta = problem.xp_reward ?? 20;
    }

    const { newXp, newLevel, newStreak } = await applyUserRewards(
      client,
      userId,
      xpDelta,
      alreadySolved,
    );

    // ── 10. Update acceptance rate ────────────────────────────────────────────
    await client.query(
      `UPDATE problems
       SET acceptance_rate = (
         SELECT ROUND(
           (COUNT(*) FILTER (WHERE is_correct) * 100.0) / NULLIF(COUNT(*), 0),
           2
         )
         FROM submissions
         WHERE problem_id = $1
       )
       WHERE id = $1`,
      [problem.id],
    );

    // ── 11. Evaluate badges ───────────────────────────────────────────────────
    let newBadges = [];
    let finalXp = newXp;
    let finalLevel = newLevel;

    if (isCorrect && !alreadySolved) {
      const { earned, finalXp: xpAfterBadges } = await evaluateBadges(
        client,
        userId,
        {
          newXp,
          newLevel,
          newStreak,
          problemId: problem.id,
          difficulty: problem.difficulty,
        },
      );
      newBadges = earned;
      finalXp = xpAfterBadges;
      finalLevel = computeLevel(finalXp).level;
    }

    await client.query("COMMIT");

    return res.json({
      status: "success",
      data: {
        submission_id: submissionId,
        is_correct: isCorrect,
        timed_out,
        execution_time_ms: executionMs,
        error: execError,
        rows: userRows,
        columns,
        // Always server-authoritative
        xp_delta: xpDelta,
        new_xp: finalXp,
        new_level: finalLevel,
        new_streak: newStreak,
        already_solved: alreadySolved,
        lesson_completed: lessonCompleted,
        track_completed: trackCompleted,
        new_badges: newBadges,
        problem_id: problem.id,
        xp_reward: problem.xp_reward,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/submit", err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
