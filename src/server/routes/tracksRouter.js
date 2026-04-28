import { Router } from "express";
import { db } from "#shared/config/db.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";

const router = new Router();

router.use(authenticateToken);

/**
 * GET /api/tracks
 * Returns all published tracks with:
 * - Full lesson + problem data
 * - Real user progress (completed / in-progress / locked)
 * - Track-level `unlocked` flag (based on previous track's exam pass)
 */
router.get("/", async (req, res) => {
  const userId = req.user.id;

  try {
    const { rows } = await db.query(
      `
      WITH user_lesson AS (
        SELECT lesson_id, completed
        FROM user_lesson_progress
        WHERE user_id = $1
      ),
      user_problem AS (
        SELECT problem_id, is_solved
        FROM user_problem_state
        WHERE user_id = $1
      ),
      -- Determine if each track is unlocked (first track = always unlocked)
      track_unlock AS (
        SELECT 
          t.id,
          COALESCE(
            -- First track is always unlocked
            (t.track_order = 0),
            -- Otherwise check if user passed the PREVIOUS track's exam
            EXISTS (
              SELECT 1
              FROM track_exams prev_exam
              JOIN track_exam_submissions sub 
                ON sub.exam_id = prev_exam.id
              WHERE prev_exam.track_id = (
                SELECT prev.id 
                FROM tracks prev 
                WHERE prev.track_order = t.track_order - 1 
                  AND prev.is_published = true
                LIMIT 1
              )
              AND sub.user_id = $1
              AND sub.passed = true
            ),
            false
          ) AS unlocked
        FROM tracks t
        WHERE t.is_published = true
      )
      SELECT 
        t.id,
        t.title,
        t.description,
        t.difficulty,
        t.pass_threshold,
        tu.unlocked,

        COUNT(DISTINCT l.id) AS total_lessons,

        json_agg(
          json_build_object(
            'id',              l.id,
            'title',           l.title,
            'description',     COALESCE(l.description, ''),
            'type',            'lesson',
            'completed',       COALESCE(ul.completed, false),
            'status',          CASE 
                                 WHEN COALESCE(ul.completed, false) THEN 'completed'
                                 WHEN l.lesson_order = 1 
                                   OR EXISTS (
                                     SELECT 1 
                                     FROM lessons prev 
                                     JOIN user_lesson ul_prev ON ul_prev.lesson_id = prev.id
                                     WHERE prev.track_id = t.id 
                                       AND prev.lesson_order < l.lesson_order 
                                       AND ul_prev.completed = true
                                   ) 
                                   THEN 'in-progress'
                                 ELSE 'locked'
                               END,
            'whatYouLearn',    COALESCE(l.learning_goals, '{}'),
            'objectives',      COALESCE(l.objectives, '{}'),
            'problem',         CASE 
                                 WHEN p.id IS NOT NULL THEN
                                   json_build_object(
                                     'id',         p.id,
                                     'title',      p.title,
                                     'difficulty', COALESCE(p.difficulty, 'Medium'),
                                     'completed',  COALESCE(up.is_solved, false)
                                   )
                                 ELSE NULL
                               END
          )
          ORDER BY l.lesson_order ASC
        ) AS lessons

      FROM tracks t
      JOIN track_unlock tu ON tu.id = t.id
      LEFT JOIN lessons l ON l.track_id = t.id
      LEFT JOIN user_lesson ul ON ul.lesson_id = l.id
      LEFT JOIN problems p ON p.lesson_id = l.id AND p.is_standalone = false
      LEFT JOIN user_problem up ON up.problem_id = p.id

      WHERE t.is_published = true

      GROUP BY t.id, t.title, t.description, t.difficulty, t.pass_threshold, tu.unlocked
      ORDER BY t.track_order ASC, t.id ASC
      `,
      [userId],
    );

    const tracks = rows.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || "",
      difficulty: t.difficulty || "beginner",
      totalLessons: Number(t.total_lessons),
      tag:
        (t.difficulty || "").toLowerCase() === "beginner"
          ? "Beginner"
          : (t.difficulty || "").toLowerCase() === "intermediate"
            ? "Intermediate"
            : "Advanced",
      unlocked: t.unlocked,
      lessons: t.lessons || [],
    }));

    res.json({ status: "success", data: tracks });
  } catch (err) {
    console.error("GET /api/tracks", err);
    res.status(500).json({ status: "error", message: "Failed to load tracks" });
  }
});

export default router;
