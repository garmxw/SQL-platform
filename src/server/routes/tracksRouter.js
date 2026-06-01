/**
 * GET /api/tracks
 *
 * Returns all published tracks with their lessons, embedded problems,
 * and exam — shaped exactly for the TracksPage frontend component.
 *
 * Response shape per track:
 * {
 *   id, title, description, difficulty, tag, totalLessons,
 *   unlocked: bool,       ← true if prerequisite track is completed
 *   exam: {               ← null if track has no exam
 *     id, title, time_limit_seconds, pass_threshold,
 *     question_count, status: "not_started"|"passed"|"failed"
 *   } | null,
 *   lessons: [{
 *     id, title, description, type, status, completed,
 *     whatYouLearn, objectives,
 *     problem: { id, title, difficulty, completed } | null
 *   }]
 * }
 */

import { Router } from "express";
import { db } from "#shared/config/db.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";

const router = new Router();
router.use(authenticateToken);

router.get("/", async (req, res) => {
  const userId = req.user?.userId;
  if (!userId)
    return res.status(401).json({ status: "error", message: "Unauthorized" });

  try {
    //  1. Fetch all published tracks with prerequisite info
    const { rows: tracks } = await db.query(
      `
      SELECT
        t.id,
        t.title,
        t.description,
        t.difficulty,
        t.track_order,
        t.prerequisite_track_id,
        t.pass_threshold,
        t.cert_threshold,
        -- Is the prerequisite track completed by this user?
        CASE
          WHEN t.prerequisite_track_id IS NULL THEN true
          ELSE COALESCE((
            SELECT utp.completed
            FROM user_track_progress utp
            WHERE utp.user_id = $1
              AND utp.track_id = t.prerequisite_track_id
          ), false)
        END AS unlocked
      FROM tracks t
      WHERE t.is_published = true
      ORDER BY t.track_order ASC, t.id ASC
    `,
      [userId],
    );

    if (!tracks.length) {
      return res.json({ status: "success", data: [] });
    }

    const trackIds = tracks.map((t) => t.id);

    //  2. Fetch all published lessons for these tracks
    const { rows: lessons } = await db.query(
      `
      SELECT
        l.id,
        l.track_id,
        l.title,
        l.description,
        l.lesson_order,
        l.learning_goals,
        l.objectives,
        -- User has completed this lesson?
        COALESCE((
          SELECT ulp.completed
          FROM user_lesson_progress ulp
          WHERE ulp.user_id = $1 AND ulp.lesson_id = l.id
        ), false) AS completed
      FROM lessons l
      WHERE l.track_id = ANY($2::int[])
        AND l.is_published = true
      ORDER BY l.track_id ASC, l.lesson_order ASC
    `,
      [userId, trackIds],
    );

    const lessonIds = lessons.map((l) => l.id);

    //  3. Fetch embedded problems for these lessons ─
    // is_standalone = false means it belongs to a lesson
    const { rows: problems } = await db.query(
      lessonIds.length
        ? `
        SELECT
          p.id,
          p.lesson_id,
          p.title,
          p.difficulty,
          COALESCE((
            SELECT ups.is_solved
            FROM user_problem_state ups
            WHERE ups.user_id = $1 AND ups.problem_id = p.id
          ), false) AS completed
        FROM problems p
        WHERE p.lesson_id = ANY($2::int[])
          AND p.is_standalone = false
          AND p.is_published = true
      `
        : "SELECT 1 WHERE false",
      lessonIds.length ? [userId, lessonIds] : [],
    );

    //  4. Fetch track exams ─
    const { rows: exams } = await db.query(
      `
      SELECT
        te.id,
        te.track_id,
        te.title,
        te.time_limit_seconds,
        te.pass_threshold,
        -- Count questions
        COUNT(DISTINCT eq.id)::int AS question_count,
        -- User's most recent submission result
        (
          SELECT
            CASE
              WHEN tes.passed = true  THEN 'passed'
              WHEN tes.passed = false THEN 'failed'
              ELSE 'not_started'
            END
          FROM track_exam_submissions tes
          WHERE tes.exam_id = te.id
            AND tes.user_id = $1
            AND tes.submitted_at IS NOT NULL
          ORDER BY tes.submitted_at DESC
          LIMIT 1
        ) AS status
      FROM track_exams te
      LEFT JOIN exam_questions eq ON eq.exam_id = te.id
      WHERE te.track_id = ANY($2::int[])
        AND te.is_published = true
      GROUP BY te.id
    `,
      [userId, trackIds],
    );

    //  5. Fetch user's track progress for completion status ─
    const { rows: trackProgress } = await db.query(
      `
      SELECT track_id, completed_problems, total_problems, completed
      FROM user_track_progress
      WHERE user_id = $1 AND track_id = ANY($2::int[])
    `,
      [userId, trackIds],
    );

    //  6. Assemble

    // Index lookups
    const problemsByLesson = problems.reduce((acc, p) => {
      acc[p.lesson_id] = p;
      return acc;
    }, {});

    const examByTrack = exams.reduce((acc, e) => {
      acc[e.track_id] = e;
      return acc;
    }, {});

    const progressByTrack = trackProgress.reduce((acc, p) => {
      acc[p.track_id] = p;
      return acc;
    }, {});

    const lessonsByTrack = lessons.reduce((acc, l) => {
      if (!acc[l.track_id]) acc[l.track_id] = [];
      acc[l.track_id].push(l);
      return acc;
    }, {});

    // Difficulty → tag label
    const tagMap = {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    };

    const data = tracks.map((track, trackIdx) => {
      const trackLessons = lessonsByTrack[track.id] ?? [];
      const exam = examByTrack[track.id] ?? null;
      const progress = progressByTrack[track.id];

      // Determine lesson status based on completion order:
      // A lesson is "locked" if any previous lesson is not completed.
      // First lesson of the first unlocked track is always accessible.
      let prevCompleted = true; // assume the gate before the first lesson is open

      const shapedLessons = trackLessons.map((lesson, lessonIdx) => {
        const problem = problemsByLesson[lesson.id] ?? null;

        let status;
        if (lesson.completed) {
          status = "completed";
        } else if (prevCompleted) {
          status =
            lessonIdx === 0 && trackIdx === 0 ? "in-progress" : "in-progress";
        } else {
          status = "locked";
        }

        // Gate: to unlock the next lesson, this lesson AND its problem must be done
        const lessonFullyDone =
          lesson.completed && (!problem || problem.completed);
        prevCompleted = lessonFullyDone;

        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description ?? "",
          // Lessons with a "challenge" problem type could be flagged differently.
          // For now: all lesson rows are type "lesson".
          type: "lesson",
          status,
          completed: lesson.completed,
          whatYouLearn: lesson.learning_goals ?? [],
          objectives: lesson.objectives ?? [],
          problem: problem
            ? {
                id: problem.id,
                title: problem.title,
                difficulty: toTitleCase(problem.difficulty),
                completed: problem.completed,
              }
            : null,
        };
      });

      return {
        id: track.id,
        title: track.title,
        description: track.description ?? "",
        difficulty: track.difficulty ?? "beginner",
        tag: tagMap[track.difficulty?.toLowerCase()] ?? "Beginner",
        totalLessons: trackLessons.length,
        unlocked: track.unlocked,
        exam: exam
          ? {
              id: exam.id,
              title: exam.title,
              time_limit_seconds: exam.time_limit_seconds,
              pass_threshold: exam.pass_threshold,
              question_count: exam.question_count ?? 0,
              status: exam.status ?? "not_started",
            }
          : null,
        lessons: shapedLessons,
      };
    });

    return res.json({ status: "success", data });
  } catch (err) {
    console.error("GET /api/tracks", err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

// ─ Helper ─

function toTitleCase(str) {
  if (!str) return "Medium";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default router;
