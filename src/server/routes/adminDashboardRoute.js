import { Router } from "express";
import { db } from "#shared/config/db.js";

const router = Router();

// ─── GET /api/adminDashboard/stats ───────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [
      usersRow,
      newUsersRow,
      activeUsersRow,
      submissionsRow,
      correctRow,
      tracksRow,
      lessonsRow,
      problemsRow,
      badgesRow,
      certsRow,
    ] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count FROM users`),
      db.query(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE created_at >= NOW() - INTERVAL '30 days'`,
      ),
      db.query(
        `SELECT COUNT(DISTINCT user_id)::int AS count FROM submissions
         WHERE created_at >= NOW() - INTERVAL '7 days'`,
      ),
      db.query(`SELECT COUNT(*)::int AS count FROM submissions`),
      db.query(
        `SELECT COUNT(*)::int AS count FROM submissions WHERE is_correct = true`,
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM tracks WHERE is_published = true`,
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM lessons WHERE is_published = true`,
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM problems WHERE is_published = true`,
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM badges WHERE is_active = true`,
      ),
      db.query(`SELECT COUNT(*)::int AS count FROM certificates`),
    ]);

    const totalSubmissions = submissionsRow.rows[0].count;
    const correctSubmissions = correctRow.rows[0].count;

    res.json({
      totalUsers: usersRow.rows[0].count,
      newUsersLast30Days: newUsersRow.rows[0].count,
      activeUsersLast7Days: activeUsersRow.rows[0].count,
      totalSubmissions,
      correctSubmissions,
      successRate:
        totalSubmissions > 0
          ? Math.round((correctSubmissions / totalSubmissions) * 100)
          : 0,
      publishedTracks: tracksRow.rows[0].count,
      publishedLessons: lessonsRow.rows[0].count,
      publishedProblems: problemsRow.rows[0].count,
      activeBadges: badgesRow.rows[0].count,
      certificatesIssued: certsRow.rows[0].count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─── GET /api/adminDashboard/submission-activity?months=6 ────────────────────
router.get("/submission-activity", async (req, res) => {
  const months = Math.min(parseInt(req.query.months) || 6, 24);
  try {
    const { rows } = await db.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
         DATE_TRUNC('month', created_at)                       AS month_date,
         COUNT(*) FILTER (WHERE is_correct = true)::int        AS correct,
         COUNT(*) FILTER (WHERE is_correct = false)::int       AS incorrect,
         COUNT(*)::int                                          AS total
       FROM submissions
       WHERE created_at >= DATE_TRUNC('month', NOW()) - ($1 - 1) * INTERVAL '1 month'
       GROUP BY month_date, month
       ORDER BY month_date`,
      [months],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch submission activity" });
  }
});

// ─── GET /api/adminDashboard/user-growth?months=6 ────────────────────────────
router.get("/user-growth", async (req, res) => {
  const months = Math.min(parseInt(req.query.months) || 6, 24);
  try {
    const { rows } = await db.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
         DATE_TRUNC('month', created_at)                       AS month_date,
         COUNT(*)::int                                          AS "newUsers"
       FROM users
       WHERE created_at >= DATE_TRUNC('month', NOW()) - ($1 - 1) * INTERVAL '1 month'
       GROUP BY month_date, month
       ORDER BY month_date`,
      [months],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user growth" });
  }
});

// ─── GET /api/adminDashboard/difficulty-distribution ─────────────────────────
router.get("/difficulty-distribution", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         COALESCE(difficulty, 'Unset') AS difficulty,
         COUNT(*)::int                  AS count
       FROM problems
       WHERE is_published = true
       GROUP BY difficulty
       ORDER BY count DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch difficulty distribution" });
  }
});

// ─── GET /api/adminDashboard/top-problems?limit=5 ────────────────────────────
router.get("/top-problems", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 5, 20);
  try {
    const { rows } = await db.query(
      `SELECT
         p.id,
         p.title,
         p.difficulty,
         COALESCE(p.acceptance_rate, 0)::numeric(5,1) AS "acceptanceRate",
         COUNT(s.id)::int                              AS "totalAttempts"
       FROM problems p
       LEFT JOIN submissions s ON s.problem_id = p.id
       WHERE p.is_published = true
       GROUP BY p.id
       ORDER BY "totalAttempts" DESC
       LIMIT $1`,
      [limit],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch top problems" });
  }
});

// ─── GET /api/adminDashboard/recent-users?limit=5 ────────────────────────────
router.get("/recent-users", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 5, 50);
  try {
    const { rows } = await db.query(
      `SELECT
         id,
         username,
         COALESCE(display_name, username) AS "displayName",
         avatar_url                        AS "avatarUrl",
         COALESCE(xp, 0)                  AS xp,
         COALESCE(level, 1)               AS level,
         created_at                        AS "createdAt",
         COALESCE(is_verified, false)      AS "isVerified",
         COALESCE(user_role, 'user')       AS role
       FROM users
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recent users" });
  }
});

// ─── GET /api/adminDashboard/track-completion ────────────────────────────────
router.get("/track-completion", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         t.id,
         t.title,
         t.difficulty,
         COUNT(utp.user_id)::int                                          AS enrolled,
         COUNT(utp.user_id) FILTER (WHERE utp.completed = true)::int     AS completed,
         CASE
           WHEN COUNT(utp.user_id) = 0 THEN 0
           ELSE ROUND(
             COUNT(utp.user_id) FILTER (WHERE utp.completed = true)::numeric
             / COUNT(utp.user_id) * 100
           )
         END::int AS "completionRate"
       FROM tracks t
       LEFT JOIN user_track_progress utp ON utp.track_id = t.id
       WHERE t.is_published = true
       GROUP BY t.id
       ORDER BY enrolled DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch track completion" });
  }
});

export default router;
