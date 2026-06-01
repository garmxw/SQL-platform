/**
 * Home Page API Routes
 * Mount as: router.use("/home", authenticateToken, homeRouter)
 * All routes → GET /api/home/...
 */

import { Router } from "express";
import { db } from "#shared/config/db.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/home/me
// Logged-in user's profile snapshot for the hero greeting card
// ─────────────────────────────────────────────────────────────────────────────
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [userRes, solvedRes, badgesRes, certsRes] = await Promise.all([
      db.query(
        `SELECT id, username, display_name, avatar_url, xp, level,
                current_streak, longest_streak, bio, location
         FROM users WHERE id = $1`,
        [userId],
      ),
      db.query(
        `SELECT COUNT(DISTINCT problem_id)::int AS solved
         FROM (
           SELECT problem_id FROM user_problem_state WHERE user_id = $1 AND is_solved = true
           UNION
           SELECT problem_id FROM submissions       WHERE user_id = $1 AND is_correct = true
         ) x`,
        [userId],
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM user_badges WHERE user_id = $1`,
        [userId],
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM certificates WHERE user_id = $1`,
        [userId],
      ),
    ]);

    const u = userRes.rows[0];
    if (!u) return res.status(404).json({ error: "User not found" });

    res.json({
      id: u.id,
      username: u.username,
      displayName: u.display_name || u.username,
      avatarUrl: u.avatar_url,
      xp: u.xp || 0,
      level: u.level || 1,
      currentStreak: u.current_streak || 0,
      longestStreak: u.longest_streak || 0,
      bio: u.bio,
      location: u.location,
      totalSolved: solvedRes.rows[0]?.solved || 0,
      totalBadges: badgesRes.rows[0]?.count || 0,
      totalCerts: certsRes.rows[0]?.count || 0,
    });
  } catch (err) {
    console.error("[home/me]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/home/continue
// The track + lesson the user should continue next
// ─────────────────────────────────────────────────────────────────────────────
router.get("/continue", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find the most recently updated in-progress track
    const trackRes = await db.query(
      `SELECT
         t.id            AS track_id,
         t.title         AS track_title,
         t.difficulty,
         t.cover_image_url,
         utp.completed_problems,
         utp.total_problems,
         utp.updated_at
       FROM user_track_progress utp
       JOIN tracks t ON t.id = utp.track_id
       WHERE utp.user_id = $1
         AND utp.completed = false
         AND t.is_published = true
       ORDER BY utp.updated_at DESC
       LIMIT 1`,
      [userId],
    );

    if (trackRes.rows.length === 0) {
      // No in-progress track — suggest the first published track
      const firstTrack = await db.query(
        `SELECT id AS track_id, title AS track_title, difficulty, cover_image_url
         FROM tracks WHERE is_published = true ORDER BY track_order ASC LIMIT 1`,
      );
      return res.json({
        track: firstTrack.rows[0] || null,
        lesson: null,
        problem: null,
      });
    }

    const track = trackRes.rows[0];

    // Find the next uncompleted lesson in that track
    const lessonRes = await db.query(
      `SELECT l.id, l.title, l.lesson_order, l.xp_reward
       FROM lessons l
       LEFT JOIN user_lesson_progress ulp
         ON ulp.lesson_id = l.id AND ulp.user_id = $1
       WHERE l.track_id = $2
         AND l.is_published = true
         AND (ulp.completed IS NULL OR ulp.completed = false)
       ORDER BY l.lesson_order ASC
       LIMIT 1`,
      [userId, track.track_id],
    );

    // Find the next unsolved problem linked to that track
    const problemRes = await db.query(
      `SELECT p.id, p.title, p.difficulty, p.xp_reward
       FROM problems p
       JOIN lessons l ON l.id = p.lesson_id
       LEFT JOIN user_problem_state ups
         ON ups.problem_id = p.id AND ups.user_id = $1
       WHERE l.track_id = $2
         AND p.is_published = true
         AND (ups.is_solved IS NULL OR ups.is_solved = false)
       ORDER BY l.lesson_order ASC, p.id ASC
       LIMIT 1`,
      [userId, track.track_id],
    );

    res.json({
      track: {
        id: track.track_id,
        title: track.track_title,
        difficulty: track.difficulty,
        coverImageUrl: track.cover_image_url,
        completedProblems: parseInt(track.completed_problems, 10) || 0,
        totalProblems: parseInt(track.total_problems, 10) || 0,
        progressPct:
          track.total_problems > 0
            ? Math.round(
                (track.completed_problems / track.total_problems) * 100,
              )
            : 0,
      },
      lesson: lessonRes.rows[0] || null,
      problem: problemRes.rows[0] || null,
    });
  } catch (err) {
    console.error("[home/continue]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/home/stats
// User's personal stats for the stats strip
// ─────────────────────────────────────────────────────────────────────────────
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [solvedRes, attemptsRes, streakRes, certsRes, xpRes] =
      await Promise.all([
        // Total distinct problems solved
        db.query(
          `SELECT COUNT(DISTINCT problem_id)::int AS solved
         FROM (
           SELECT problem_id FROM user_problem_state WHERE user_id = $1 AND is_solved = true
           UNION
           SELECT problem_id FROM submissions       WHERE user_id = $1 AND is_correct = true
         ) x`,
          [userId],
        ),
        // Total submissions
        db.query(
          `SELECT
           COUNT(*)::int                                    AS total,
           COUNT(*) FILTER (WHERE is_correct = true)::int  AS correct
         FROM submissions WHERE user_id = $1`,
          [userId],
        ),
        db.query(
          `SELECT current_streak, longest_streak, xp, level FROM users WHERE id = $1`,
          [userId],
        ),
        db.query(
          `SELECT COUNT(*)::int AS count FROM certificates WHERE user_id = $1`,
          [userId],
        ),
        // XP earned this week
        db.query(
          `SELECT COALESCE(SUM(p.xp_reward), 0)::int AS weekly_xp
         FROM submissions s
         JOIN problems p ON p.id = s.problem_id
         WHERE s.user_id = $1
           AND s.is_correct = true
           AND s.created_at >= NOW() - INTERVAL '7 days'`,
          [userId],
        ),
      ]);

    const a = attemptsRes.rows[0];
    const s = streakRes.rows[0];

    res.json({
      totalSolved: solvedRes.rows[0]?.solved || 0,
      totalAttempts: a?.total || 0,
      correctRate: a?.total > 0 ? Math.round((a.correct / a.total) * 100) : 0,
      currentStreak: s?.current_streak || 0,
      longestStreak: s?.longest_streak || 0,
      xp: s?.xp || 0,
      level: s?.level || 1,
      certificates: certsRes.rows[0]?.count || 0,
      weeklyXp: xpRes.rows[0]?.weekly_xp || 0,
    });
  } catch (err) {
    console.error("[home/stats]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/home/activity?days=30
// Daily submission counts for the activity heatmap (GitHub-style)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/activity", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);

    const result = await db.query(
      `WITH day_series AS (
         SELECT generate_series(
           DATE_TRUNC('day', NOW() - ($2 * INTERVAL '1 day')),
           DATE_TRUNC('day', NOW()),
           INTERVAL '1 day'
         )::date AS day
       ),
       daily AS (
         SELECT
           DATE_TRUNC('day', created_at)::date AS day,
           COUNT(*)::int                        AS submissions,
           COUNT(*) FILTER (WHERE is_correct = true)::int AS correct
         FROM submissions
         WHERE user_id = $1
           AND created_at >= NOW() - ($2 * INTERVAL '1 day')
         GROUP BY 1
       )
       SELECT
         ds.day,
         COALESCE(d.submissions, 0) AS submissions,
         COALESCE(d.correct, 0)     AS correct
       FROM day_series ds
       LEFT JOIN daily d ON d.day = ds.day
       ORDER BY ds.day ASC`,
      [userId, days],
    );

    res.json(
      result.rows.map((r) => ({
        day: r.day,
        submissions: r.submissions,
        correct: r.correct,
      })),
    );
  } catch (err) {
    console.error("[home/activity]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/home/recent-badges?limit=5
// Latest badges earned by the user
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recent-badges", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);

    const result = await db.query(
      `SELECT
         b.id, b.name, b.description, b.icon_url, b.rarity, b.xp_reward,
         ub.earned_at
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        iconUrl: r.icon_url,
        rarity: r.rarity,
        xpReward: r.xp_reward,
        earnedAt: r.earned_at,
      })),
    );
  } catch (err) {
    console.error("[home/recent-badges]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/home/new-content?limit=6
// Recently published lessons and problems (platform news)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/new-content", authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 6, 20);

    const [lessonsRes, problemsRes] = await Promise.all([
      db.query(
        `SELECT
           l.id, l.title, l.description, l.xp_reward, l.created_at,
           t.title AS track_title, t.difficulty
         FROM lessons l
         JOIN tracks t ON t.id = l.track_id
         WHERE l.is_published = true
         ORDER BY l.created_at DESC
         LIMIT $1`,
        [Math.ceil(limit / 2)],
      ),
      db.query(
        `SELECT
           p.id, p.title, p.difficulty, p.xp_reward, p.created_at,
           p.acceptance_rate
         FROM problems p
         WHERE p.is_published = true
         ORDER BY p.created_at DESC
         LIMIT $1`,
        [Math.floor(limit / 2)],
      ),
    ]);

    const lessons = lessonsRes.rows.map((r) => ({
      type: "lesson",
      id: r.id,
      title: r.title,
      description: r.description,
      xpReward: r.xp_reward,
      createdAt: r.created_at,
      trackTitle: r.track_title,
      difficulty: r.difficulty,
    }));

    const problems = problemsRes.rows.map((r) => ({
      type: "problem",
      id: r.id,
      title: r.title,
      difficulty: r.difficulty,
      xpReward: r.xp_reward,
      createdAt: r.created_at,
      acceptanceRate: r.acceptance_rate ? parseFloat(r.acceptance_rate) : null,
    }));

    // Merge and sort by date descending
    const merged = [...lessons, ...problems].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    res.json(merged.slice(0, limit));
  } catch (err) {
    console.error("[home/new-content]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/home/recommended-problems?limit=4
// Problems the user hasn't solved yet, matched to their current track difficulty
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recommended-problems", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 4, 10);

    const result = await db.query(
      `SELECT
         p.id, p.title, p.difficulty, p.xp_reward, p.acceptance_rate,
         p.hint_xp_penalty
       FROM problems p
       LEFT JOIN user_problem_state ups
         ON ups.problem_id = p.id AND ups.user_id = $1
       WHERE p.is_published = true
         AND p.is_standalone = true
         AND (ups.is_solved IS NULL OR ups.is_solved = false)
       ORDER BY
         CASE p.difficulty
           WHEN 'easy'   THEN 1
           WHEN 'medium' THEN 2
           WHEN 'hard'   THEN 3
           ELSE 4
         END ASC,
         p.acceptance_rate DESC NULLS LAST
       LIMIT $2`,
      [userId, limit],
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        difficulty: r.difficulty,
        xpReward: r.xp_reward,
        acceptanceRate: r.acceptance_rate
          ? parseFloat(r.acceptance_rate)
          : null,
      })),
    );
  } catch (err) {
    console.error("[home/recommended-problems]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/home/leaderboard-peek?limit=5
// Top 5 users by XP so the home page shows a mini leaderboard
// ─────────────────────────────────────────────────────────────────────────────
router.get("/leaderboard-peek", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 10);

    const [topRes, myRankRes] = await Promise.all([
      db.query(
        `SELECT id, username, display_name, avatar_url, xp, level
         FROM users
         WHERE user_role = 'student' AND is_verified = true
         ORDER BY xp DESC NULLS LAST
         LIMIT $1`,
        [limit],
      ),
      db.query(
        `SELECT COUNT(*) + 1 AS my_rank
         FROM users
         WHERE user_role = 'student'
           AND is_verified = true
           AND xp > (SELECT xp FROM users WHERE id = $1)`,
        [userId],
      ),
    ]);

    res.json({
      top: topRes.rows.map((r, i) => ({
        rank: i + 1,
        id: r.id,
        username: r.username,
        displayName: r.display_name || r.username,
        avatarUrl: r.avatar_url,
        xp: r.xp || 0,
        level: r.level || 1,
        isMe: r.id === userId,
      })),
      myRank: parseInt(myRankRes.rows[0]?.my_rank, 10) || null,
    });
  } catch (err) {
    console.error("[home/leaderboard-peek]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
