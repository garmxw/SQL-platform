/**
 * Admin Dashboard API Routes
 * Mount this in your router with your auth middleware, e.g.:
 *
 *   import adminDashboardRouter from "./routes/adminDashboard.js";
 *   router.use("/adminDashboard", authenticateToken, adminDashboardRouter);
 *
 * This makes every route reachable at /api/adminDashboard/<route>
 * e.g. GET /api/adminDashboard/stats
 */

import { Router } from "express";
import { db } from "#shared/config/db.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /stats
// High-level KPI cards: users, submissions, content, badges, certificates
// ─────────────────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [
      usersResult,
      newUsersResult,
      activeUsersResult,
      submissionsResult,
      solvedResult,
      tracksResult,
      lessonsResult,
      problemsResult,
      badgesResult,
      certificatesResult,
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total FROM users`),

      db.query(
        `SELECT COUNT(*) AS total FROM users
         WHERE created_at >= NOW() - INTERVAL '30 days'`,
      ),

      db.query(
        `SELECT COUNT(*) AS total FROM users
         WHERE last_login >= NOW() - INTERVAL '7 days'`,
      ),

      db.query(`SELECT COUNT(*) AS total FROM submissions`),

      db.query(
        `SELECT COUNT(*) AS total FROM submissions WHERE is_correct = true`,
      ),

      db.query(
        `SELECT COUNT(*) AS total FROM tracks WHERE is_published = true`,
      ),

      db.query(
        `SELECT COUNT(*) AS total FROM lessons WHERE is_published = true`,
      ),

      db.query(
        `SELECT COUNT(*) AS total FROM problems WHERE is_published = true`,
      ),

      db.query(`SELECT COUNT(*) AS total FROM badges WHERE is_active = true`),

      db.query(`SELECT COUNT(*) AS total FROM certificates`),
    ]);

    const totalSubmissions = parseInt(submissionsResult.rows[0].total, 10);
    const correctSubmissions = parseInt(solvedResult.rows[0].total, 10);

    res.json({
      totalUsers: parseInt(usersResult.rows[0].total, 10),
      newUsersLast30Days: parseInt(newUsersResult.rows[0].total, 10),
      activeUsersLast7Days: parseInt(activeUsersResult.rows[0].total, 10),
      totalSubmissions,
      correctSubmissions,
      successRate:
        totalSubmissions > 0
          ? Math.round((correctSubmissions / totalSubmissions) * 100)
          : 0,
      publishedTracks: parseInt(tracksResult.rows[0].total, 10),
      publishedLessons: parseInt(lessonsResult.rows[0].total, 10),
      publishedProblems: parseInt(problemsResult.rows[0].total, 10),
      activeBadges: parseInt(badgesResult.rows[0].total, 10),
      certificatesIssued: parseInt(certificatesResult.rows[0].total, 10),
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /user-growth?months=6
// Monthly new-user registrations for the area chart
// ─────────────────────────────────────────────────────────────────────────────
router.get("/user-growth", async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months, 10) || 6, 24);

    const result = await db.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
         DATE_TRUNC('month', created_at)                      AS month_date,
         COUNT(*)                                             AS new_users
       FROM users
       WHERE created_at >= NOW() - ($1 || ' months')::INTERVAL
       GROUP BY month_date, month
       ORDER BY month_date ASC`,
      [months],
    );

    res.json(
      result.rows.map((r) => ({
        month: r.month,
        newUsers: parseInt(r.new_users, 10),
      })),
    );
  } catch (err) {
    console.error("[admin/user-growth]", err);
    res.status(500).json({ error: "Failed to load user growth" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /submission-activity?months=6
// Monthly correct vs incorrect submissions for the bar chart
// ─────────────────────────────────────────────────────────────────────────────
router.get("/submission-activity", async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months, 10) || 6, 24);

    const result = await db.query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
         DATE_TRUNC('month', created_at)                      AS month_date,
         COUNT(*) FILTER (WHERE is_correct = true)            AS correct,
         COUNT(*) FILTER (WHERE is_correct = false)           AS incorrect,
         COUNT(*)                                             AS total
       FROM submissions
       WHERE created_at >= NOW() - ($1 || ' months')::INTERVAL
       GROUP BY month_date, month
       ORDER BY month_date ASC`,
      [months],
    );

    res.json(
      result.rows.map((r) => ({
        month: r.month,
        correct: parseInt(r.correct, 10),
        incorrect: parseInt(r.incorrect, 10),
        total: parseInt(r.total, 10),
      })),
    );
  } catch (err) {
    console.error("[admin/submission-activity]", err);
    res.status(500).json({ error: "Failed to load submission activity" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /difficulty-distribution
// Published problem count grouped by difficulty for the pie chart
// ─────────────────────────────────────────────────────────────────────────────
router.get("/difficulty-distribution", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         COALESCE(difficulty, 'Unset') AS difficulty,
         COUNT(*)                      AS count
       FROM problems
       WHERE is_published = true
       GROUP BY difficulty
       ORDER BY count DESC`,
    );

    res.json(
      result.rows.map((r) => ({
        difficulty: r.difficulty,
        count: parseInt(r.count, 10),
      })),
    );
  } catch (err) {
    console.error("[admin/difficulty-distribution]", err);
    res.status(500).json({ error: "Failed to load difficulty distribution" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /top-problems?limit=5
// Most attempted published problems
// ─────────────────────────────────────────────────────────────────────────────
router.get("/top-problems", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);

    const result = await db.query(
      `SELECT
         p.id,
         p.title,
         p.difficulty,
         p.acceptance_rate,
         COUNT(s.id)                                  AS total_attempts,
         COUNT(s.id) FILTER (WHERE s.is_correct)      AS correct_attempts
       FROM problems p
       LEFT JOIN submissions s ON s.problem_id = p.id
       WHERE p.is_published = true
       GROUP BY p.id, p.title, p.difficulty, p.acceptance_rate
       ORDER BY total_attempts DESC
       LIMIT $1`,
      [limit],
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        difficulty: r.difficulty,
        acceptanceRate: r.acceptance_rate
          ? parseFloat(r.acceptance_rate)
          : r.total_attempts > 0
            ? Math.round((r.correct_attempts / r.total_attempts) * 100)
            : 0,
        totalAttempts: parseInt(r.total_attempts, 10),
      })),
    );
  } catch (err) {
    console.error("[admin/top-problems]", err);
    res.status(500).json({ error: "Failed to load top problems" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /recent-users?limit=5
// Latest registered users
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recent-users", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 50);

    const result = await db.query(
      `SELECT
         id, username, display_name, email,
         avatar_url, xp, level, created_at,
         is_verified, user_role
       FROM users
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name || r.username,
        email: r.email,
        avatarUrl: r.avatar_url,
        xp: r.xp || 0,
        level: r.level || 1,
        createdAt: r.created_at,
        isVerified: r.is_verified,
        role: r.user_role,
      })),
    );
  } catch (err) {
    console.error("[admin/recent-users]", err);
    res.status(500).json({ error: "Failed to load recent users" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /track-completion
// Per-track enrolled vs completed counts + completion rate
// ─────────────────────────────────────────────────────────────────────────────
router.get("/track-completion", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         t.id,
         t.title,
         t.difficulty,
         COUNT(utp.id)                                       AS enrolled,
         COUNT(utp.id) FILTER (WHERE utp.completed = true)   AS completed
       FROM tracks t
       LEFT JOIN user_track_progress utp ON utp.track_id = t.id
       WHERE t.is_published = true
       GROUP BY t.id, t.title, t.difficulty
       ORDER BY enrolled DESC`,
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        difficulty: r.difficulty,
        enrolled: parseInt(r.enrolled, 10),
        completed: parseInt(r.completed, 10),
        completionRate:
          r.enrolled > 0 ? Math.round((r.completed / r.enrolled) * 100) : 0,
      })),
    );
  } catch (err) {
    console.error("[admin/track-completion]", err);
    res.status(500).json({ error: "Failed to load track completion" });
  }
});

export default router;
