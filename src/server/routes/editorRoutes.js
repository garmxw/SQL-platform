/**
 * editorRouter.js — GET /api/editor
 *
 * Query params: ?type=lesson|problem|exam &id=<number>
 *
 * FIXES:
 *  [1] Always JOINs users table to return authoritative xp + level in userStats.
 *  [2] Lesson type: reads is_solved from user_problem_state (when problem exists)
 *      OR completed from user_lesson_progress (no-problem lessons).
 *  [3] Problem type: reads is_solved from user_problem_state.
 *  [4] submissions always returned newest-first, limited to last 20.
 *  [5] Lessons without a linked problem: problem is null, sql_variants come
 *      from lesson_sql_variants only.
 *  [6] sql_variants assembled correctly into { starter, schema, solution } map.
 */

import { Router } from "express";
import { db } from "#shared/config/db.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";

const router = new Router();
router.use(authenticateToken);

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the structured sql_variants map { starter, schema, solution }
 * from problem_sql_variants rows.
 */
function buildSqlVariants(rows) {
  const starter = {};
  const schema = {};
  const solution = {};

  for (const row of rows) {
    const d = row.dialect; // e.g. 'mysql' | 'postgres' | 'sqlite' | 'universal'
    if (row.variant_type === "starter") {
      starter[d] = row.sql_text;
    } else if (row.variant_type === "schema") {
      schema[d] = row.sql_text;
    } else if (row.variant_type === "solution") {
      if (!solution[d]) solution[d] = [];
      solution[d].push(row.sql_text);
    }
  }

  return { starter, schema, solution };
}

/**
 * Build demo_sql_variants map { dialect: sql_text } from lesson_sql_variants rows.
 */
function buildDemoSqlVariants(rows) {
  const map = {};
  for (const row of rows) {
    map[row.dialect] = row.sql_text;
  }
  return map;
}

/**
 * FIX [1]: Fetch authoritative user stats (xp, level) from users table.
 */
async function fetchUserStats(userId) {
  const res = await db.query(`SELECT xp, level FROM users WHERE id = $1`, [
    userId,
  ]);
  const row = res.rows[0];
  return {
    xp: typeof row?.xp === "number" ? row.xp : 0,
    level: typeof row?.level === "number" ? row.level : 1,
  };
}

/**
 * Fetch last 20 submissions for a user/problem, newest first.
 */
async function fetchSubmissions(userId, problemId) {
  if (!problemId) return [];
  const res = await db.query(
    `SELECT submitted_sql, is_correct, execution_time_ms, created_at
     FROM submissions
     WHERE user_id = $1 AND problem_id = $2
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId, problemId],
  );
  return res.rows;
}

// ─── GET /api/editor ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  const { type, id } = req.query;
  const numId = Number(id);

  if (!type || !["lesson", "problem", "exam"].includes(type)) {
    return res.status(400).json({
      status: "error",
      message: "'type' must be lesson, problem, or exam",
    });
  }
  if (!numId || isNaN(numId)) {
    return res
      .status(400)
      .json({ status: "error", message: "'id' must be a positive integer" });
  }

  try {
    // ── Always fetch current user XP/level ─────────────────────────────────
    const userStats = await fetchUserStats(userId);

    // ── LESSON ────────────────────────────────────────────────────────────────
    if (type === "lesson") {
      // 1. Fetch lesson
      const lessonRes = await db.query(
        `SELECT l.*, t.title AS track_title, t.id AS track_id_val
         FROM lessons l
         JOIN tracks t ON t.id = l.track_id
         WHERE l.id = $1 AND l.is_published = true`,
        [numId],
      );
      if (!lessonRes.rows.length) {
        return res
          .status(404)
          .json({ status: "error", message: "Lesson not found" });
      }
      const lessonRow = lessonRes.rows[0];

      // 2. Demo SQL variants (for lessons without problems)
      const demoSqlRes = await db.query(
        `SELECT dialect, sql_text FROM lesson_sql_variants WHERE lesson_id = $1`,
        [numId],
      );
      const demo_sql_variants = buildDemoSqlVariants(demoSqlRes.rows);

      // If lesson has a demo_sql column, inject it as universal fallback
      if (lessonRow.demo_sql && !demo_sql_variants["universal"]) {
        demo_sql_variants["universal"] = lessonRow.demo_sql;
      }

      const lesson = {
        id: lessonRow.id,
        track_id: lessonRow.track_id,
        title: lessonRow.title,
        content: lessonRow.content,
        description: lessonRow.description ?? null,
        learning_goals: lessonRow.learning_goals ?? [],
        objectives: lessonRow.objectives ?? [],
        xp_reward: lessonRow.xp_reward ?? 0,
        hint_xp_penalty: lessonRow.hint_xp_penalty ?? 0,
        solution_xp_penalty: lessonRow.solution_xp_penalty ?? 0,
        tags: lessonRow.tags ?? null,
        lesson_order: lessonRow.lesson_order,
        demo_sql_variants,
      };

      // 3. Navigation (prev / next lesson in same track)
      const navRes = await db.query(
        `SELECT id, title, lesson_order
         FROM lessons
         WHERE track_id = $1 AND is_published = true
         ORDER BY lesson_order`,
        [lessonRow.track_id],
      );
      const navLessons = navRes.rows;
      const navIdx = navLessons.findIndex((l) => l.id === numId);
      const navigation = {
        prev: navIdx > 0 ? navLessons[navIdx - 1] : null,
        next: navIdx < navLessons.length - 1 ? navLessons[navIdx + 1] : null,
      };

      // 4. Track info
      const track = { id: lessonRow.track_id, title: lessonRow.track_title };

      // 5. FIX [5]: Check if this lesson has a linked problem
      const probRes = await db.query(
        `SELECT p.*
         FROM problems p
         WHERE p.lesson_id = $1
           AND p.is_standalone = false
           AND p.is_published = true
         LIMIT 1`,
        [numId],
      );

      let problem = null;
      let is_solved = false;
      let completed = false;
      let submissions = [];

      if (probRes.rows.length) {
        const probRow = probRes.rows[0];

        // FIX [6]: sql_variants
        const varRes = await db.query(
          `SELECT variant_type, dialect, sql_text
           FROM problem_sql_variants
           WHERE problem_id = $1
           ORDER BY sort_order`,
          [probRow.id],
        );
        const sql_variants = buildSqlVariants(varRes.rows);

        // Hints
        const hintRes = await db.query(
          `SELECT id, hint_order, content, xp_penalty, dialect
           FROM problem_hints
           WHERE problem_id = $1
           ORDER BY hint_order`,
          [probRow.id],
        );

        // Solutions (explanations)
        const solRes = await db.query(
          `SELECT id, explanation, sql_text, dialect
           FROM problem_solutions
           WHERE problem_id = $1`,
          [probRow.id],
        );

        problem = {
          id: probRow.id,
          title: probRow.title,
          description: probRow.description,
          difficulty: probRow.difficulty,
          xp_reward: probRow.xp_reward ?? 0,
          hint_xp_penalty: probRow.hint_xp_penalty ?? 0,
          solution_xp_penalty: probRow.solution_xp_penalty ?? 0,
          order_matters: probRow.order_matters ?? false,
          time_limit_seconds: probRow.time_limit_seconds ?? null,
          acceptance_rate: probRow.acceptance_rate ?? null,
          tags: probRow.tags ?? null,
          sql_variants,
          hints: hintRes.rows,
          solutions: solRes.rows,
        };

        // FIX [2]: solved state = user_problem_state.is_solved for lesson-with-problem
        const stateRes = await db.query(
          `SELECT is_solved, attempts
           FROM user_problem_state
           WHERE user_id = $1 AND problem_id = $2`,
          [userId, probRow.id],
        );
        is_solved = stateRes.rows[0]?.is_solved ?? false;
        submissions = await fetchSubmissions(userId, probRow.id);
      }

      // FIX [2]: lesson completion state from user_lesson_progress
      const lpRes = await db.query(
        `SELECT completed
         FROM user_lesson_progress
         WHERE user_id = $1 AND lesson_id = $2`,
        [userId, numId],
      );
      completed = lpRes.rows[0]?.completed ?? false;

      return res.json({
        status: "success",
        data: {
          type: "lesson",
          lesson,
          problem,
          track,
          navigation,
          userProgress: {
            // FIX [2]: For lessons with problem use is_solved; without use completed.
            is_solved: problem ? is_solved : null,
            completed: problem ? is_solved || completed : completed,
            submissions,
            userStats, // FIX [1]: always includes real xp + level
          },
        },
      });
    }

    // ── PROBLEM ───────────────────────────────────────────────────────────────
    if (type === "problem") {
      const probRes = await db.query(
        `SELECT * FROM problems
         WHERE id = $1 AND is_standalone = true AND is_published = true`,
        [numId],
      );
      if (!probRes.rows.length) {
        return res
          .status(404)
          .json({ status: "error", message: "Problem not found" });
      }
      const probRow = probRes.rows[0];

      // sql_variants
      const varRes = await db.query(
        `SELECT variant_type, dialect, sql_text
         FROM problem_sql_variants
         WHERE problem_id = $1
         ORDER BY sort_order`,
        [probRow.id],
      );
      const sql_variants = buildSqlVariants(varRes.rows);

      // Hints
      const hintRes = await db.query(
        `SELECT id, hint_order, content, xp_penalty, dialect
         FROM problem_hints
         WHERE problem_id = $1
         ORDER BY hint_order`,
        [probRow.id],
      );

      // Solutions
      const solRes = await db.query(
        `SELECT id, explanation, sql_text, dialect
         FROM problem_solutions
         WHERE problem_id = $1`,
        [probRow.id],
      );

      // Similar problems (same difficulty, not this one)
      const similarRes = await db.query(
        `SELECT id, title, difficulty
         FROM problems
         WHERE difficulty = $1
           AND id != $2
           AND is_standalone = true
           AND is_published = true
         ORDER BY RANDOM()
         LIMIT 5`,
        [probRow.difficulty, probRow.id],
      );

      // FIX [3]: is_solved from user_problem_state
      const stateRes = await db.query(
        `SELECT is_solved, attempts
         FROM user_problem_state
         WHERE user_id = $1 AND problem_id = $2`,
        [userId, probRow.id],
      );
      const is_solved = stateRes.rows[0]?.is_solved ?? false;
      const attempts = stateRes.rows[0]?.attempts ?? 0;

      const submissions = await fetchSubmissions(userId, probRow.id);

      const problem = {
        id: probRow.id,
        title: probRow.title,
        description: probRow.description,
        difficulty: probRow.difficulty,
        xp_reward: probRow.xp_reward ?? 0,
        hint_xp_penalty: probRow.hint_xp_penalty ?? 0,
        solution_xp_penalty: probRow.solution_xp_penalty ?? 0,
        order_matters: probRow.order_matters ?? false,
        time_limit_seconds: probRow.time_limit_seconds ?? null,
        acceptance_rate: probRow.acceptance_rate ?? null,
        tags: probRow.tags ?? null,
        sql_variants,
        hints: hintRes.rows,
        solutions: solRes.rows,
      };

      return res.json({
        status: "success",
        data: {
          type: "problem",
          problem,
          similar: similarRes.rows,
          userProgress: {
            is_solved,
            attempts,
            submissions,
            userStats, // FIX [1]
          },
        },
      });
    }

    // ── EXAM ──────────────────────────────────────────────────────────────────
    if (type === "exam") {
      const examRes = await db.query(
        `SELECT te.*, t.title AS track_title
         FROM track_exams te
         JOIN tracks t ON t.id = te.track_id
         WHERE te.id = $1 AND te.is_published = true`,
        [numId],
      );
      if (!examRes.rows.length) {
        return res
          .status(404)
          .json({ status: "error", message: "Exam not found" });
      }
      const examRow = examRes.rows[0];

      // Questions
      const qRes = await db.query(
        `SELECT * FROM exam_questions
         WHERE exam_id = $1
         ORDER BY question_order`,
        [numId],
      );

      const questions = [];
      for (const q of qRes.rows) {
        let choices = null;
        let sql_variants = null;

        if (q.question_type === "multiple_choice") {
          const cRes = await db.query(
            `SELECT id, choice_text, is_correct, choice_order
             FROM exam_choices
             WHERE question_id = $1
             ORDER BY choice_order`,
            [q.id],
          );
          choices = cRes.rows;
        }

        // If linked to a problem, pull its sql_variants
        if (q.linked_problem_id) {
          const varRes = await db.query(
            `SELECT variant_type, dialect, sql_text
             FROM problem_sql_variants
             WHERE problem_id = $1
             ORDER BY sort_order`,
            [q.linked_problem_id],
          );
          sql_variants = buildSqlVariants(varRes.rows);
        }

        questions.push({
          id: q.id,
          question_order: q.question_order,
          question_type: q.question_type,
          question_text: q.question_text,
          points: q.points,
          linked_problem_id: q.linked_problem_id ?? null,
          choices,
          sql_variants,
        });
      }

      // Check for a pending/existing submission
      const subRes = await db.query(
        `SELECT id, started_at, submitted_at
         FROM track_exam_submissions
         WHERE exam_id = $1 AND user_id = $2
         ORDER BY started_at DESC
         LIMIT 1`,
        [numId, userId],
      );
      const pendingSubmission =
        subRes.rows[0] && !subRes.rows[0].submitted_at
          ? { id: subRes.rows[0].id, started_at: subRes.rows[0].started_at }
          : null;

      const exam = {
        id: examRow.id,
        track_id: examRow.track_id,
        title: examRow.title,
        description: examRow.description ?? null,
        time_limit_seconds: examRow.time_limit_seconds,
        pass_threshold: examRow.pass_threshold,
        cert_threshold: examRow.cert_threshold,
        total_points: examRow.total_points,
        track_title: examRow.track_title,
      };

      return res.json({
        status: "success",
        data: {
          type: "exam",
          exam,
          questions,
          userProgress: {
            submissions: [],
            pendingSubmission,
            userStats, // FIX [1]
          },
        },
      });
    }
  } catch (err) {
    console.error("GET /api/editor", err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

export default router;
