import { Router } from "express";
import { authenticateToken } from "#server/middleware/authMiddleware.js";
import { db } from "#shared/config/db.js";
import { authorizeRoles } from "#server/middleware/roleMiddleware.js";

const router = Router();

// Apply auth + admin check to every route in this file
router.use(authenticateToken, authorizeRoles("admin"));

// GET /api/admin/stats
// Returns platform-wide counts pulled directly from the DB.
// Used by the admin profile page for the four stat cards.
router.get("/stats", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users)                          AS total_users,
        (SELECT COUNT(*) FROM users  WHERE user_role = 'admin')   AS total_admins,
        (SELECT COUNT(*) FROM users  WHERE is_verified = true)    AS verified_users,
        (SELECT COUNT(*) FROM problems)                       AS total_problems,
        (SELECT COUNT(*) FROM submissions)                    AS total_submissions,
        (SELECT COUNT(*) FROM submissions WHERE is_correct = true) AS correct_submissions,
        (SELECT COUNT(*) FROM tracks)                         AS total_tracks,
        (SELECT COUNT(*) FROM badges)                         AS total_badges,
        -- new users in the last 7 days
        (SELECT COUNT(*) FROM users
          WHERE created_at >= NOW() - INTERVAL '7 days')     AS new_users_week,
        -- submissions today
        (SELECT COUNT(*) FROM submissions
          WHERE created_at >= CURRENT_DATE)                   AS submissions_today
    `);

    const row = rows[0];
    res.json({
      status: "success",
      data: {
        total_users: Number(row.total_users),
        total_admins: Number(row.total_admins),
        verified_users: Number(row.verified_users),
        total_problems: Number(row.total_problems),
        total_submissions: Number(row.total_submissions),
        correct_submissions: Number(row.correct_submissions),
        total_tracks: Number(row.total_tracks),
        total_badges: Number(row.total_badges),
        new_users_week: Number(row.new_users_week),
        submissions_today: Number(row.submissions_today),
      },
    });
  } catch (err) {
    console.error("GET /api/admin/stats", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/admin/activity?limit=20
// Returns the most recent platform events by joining users, submissions, problems.
// Each event has a kind so the frontend can render the right icon and color.
router.get("/activity", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  try {
    // Newest user registrations
    const usersQ = db.query(
      `
      SELECT
        'user_join' AS kind,
        u.id        AS ref_id,
        u.username  AS ref_name,
        u.created_at AS event_time
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT $1
    `,
      [limit],
    );

    // Most recent correct submissions
    const submissionsQ = db.query(
      `
      SELECT
        'submission' AS kind,
        s.id         AS ref_id,
        p.title      AS ref_name,
        s.created_at AS event_time,
        u.username   AS username
      FROM submissions s
      JOIN problems p ON p.id = s.problem_id
      JOIN users    u ON u.id = s.user_id
      ORDER BY s.created_at DESC
      LIMIT $1
    `,
      [limit],
    );

    const [usersRes, submissionsRes] = await Promise.all([
      usersQ,
      submissionsQ,
    ]);

    // Merge and sort by time desc, take the most recent `limit` events
    const events = [
      ...usersRes.rows.map((r) => ({
        kind: r.kind,
        text: "New user registered",
        sub: `${r.ref_name} joined Vorn`,
        event_time: r.event_time,
      })),
      ...submissionsRes.rows.map((r) => ({
        kind: r.kind,
        text: "Problem submitted",
        sub: `${r.username} submitted "${r.ref_name}"`,
        event_time: r.event_time,
      })),
    ]
      .sort((a, b) => new Date(b.event_time) - new Date(a.event_time))
      .slice(0, limit);

    res.json({ status: "success", data: events });
  } catch (err) {
    console.error("GET /api/admin/activity", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/admin/users
// Full user list with multi-field search and multi-filter support.
// Query params:
//   search   — matches username, display_name, email, location (case-insensitive)
//   role     — 'student' | 'admin' | '' (empty = all)
//   verified — 'true' | 'false' | '' (empty = all)
//   location — partial match on location field
//   sort     — 'newest' | 'oldest' | 'xp' | 'level' | 'username'  (default: newest)
//   page     — page number, 1-indexed (default: 1)
//   limit    — results per page, max 100 (default: 20)
router.get("/users", async (req, res) => {
  const {
    search = "",
    role = "",
    verified = "",
    location = "",
    sort = "newest",
    page = "1",
    limit = "20",
  } = req.query;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(Number(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;

  // Build WHERE clauses dynamically
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    const i = params.length;
    conditions.push(`(
      u.username     ILIKE $${i} OR
      u.display_name ILIKE $${i} OR
      u.email        ILIKE $${i} OR
      u.location     ILIKE $${i}
    )`);
  }

  if (role) {
    params.push(role);
    conditions.push(`u.user_role = $${params.length}`);
  }

  if (verified === "true") {
    conditions.push(`u.is_verified = true`);
  } else if (verified === "false") {
    conditions.push(`u.is_verified = false`);
  }

  if (location) {
    params.push(`%${location}%`);
    conditions.push(`u.location ILIKE $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // Sort
  const ORDER_MAP = {
    newest: "u.created_at DESC",
    oldest: "u.created_at ASC",
    xp: "u.xp DESC",
    level: "u.level DESC",
    username: "u.username ASC",
  };
  const orderBy = ORDER_MAP[sort] || ORDER_MAP.newest;

  try {
    // Total count for pagination
    const countRes = await db.query(
      `SELECT COUNT(*) FROM users u ${where}`,
      params,
    );
    const total = Number(countRes.rows[0].count);

    // Per-user solved problem count via user_problem_state
    const dataRes = await db.query(
      `
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.email,
        u.user_role,
        u.is_verified,
        u.created_at,
        u.last_login,
        u.xp,
        u.level,
        u.current_streak,
        u.longest_streak,
        u.location,
        u.avatar_url,
        u.github_name,
        u.twitter_name,
        u.portfolio_url,
        u.bio,
        -- count of problems the user has solved
        COALESCE(solved.cnt, 0) AS solved_count,
        -- count of total submissions
        COALESCE(subs.cnt, 0)   AS submission_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS cnt
        FROM user_problem_state
        WHERE is_solved = true
        GROUP BY user_id
      ) solved ON solved.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS cnt
        FROM submissions
        GROUP BY user_id
      ) subs ON subs.user_id = u.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
      [...params, limitNum, offset],
    );

    res.json({
      status: "success",
      data: dataRes.rows,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("GET /api/admin/users", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/admin/users/:id
// Full detail for a single user including their badge list, recent submissions,
// and track progress — all in one round trip.
router.get("/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId)
    return res
      .status(400)
      .json({ status: "error", message: "Invalid user id" });

  try {
    const userRes = await db.query(
      `
      SELECT
        u.*,
        COALESCE(solved.cnt, 0) AS solved_count,
        COALESCE(subs.cnt, 0)   AS submission_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS cnt FROM user_problem_state WHERE is_solved = true GROUP BY user_id
      ) solved ON solved.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS cnt FROM submissions GROUP BY user_id
      ) subs ON subs.user_id = u.id
      WHERE u.id = $1
    `,
      [userId],
    );

    if (!userRes.rows.length) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    const badgesRes = await db.query(
      `
      SELECT b.id, b.name, b.description, b.icon_url, b.rarity, b.xp_reward, ub.earned_at
      FROM user_badges ub
      JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
    `,
      [userId],
    );

    const subsRes = await db.query(
      `
      SELECT s.id, s.is_correct, s.execution_time_ms, s.created_at, p.title AS problem_title, p.difficulty
      FROM submissions s
      JOIN problems p ON p.id = s.problem_id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
      LIMIT 10
    `,
      [userId],
    );

    const trackRes = await db.query(
      `
      SELECT utp.*, t.title AS track_title, t.difficulty AS track_difficulty
      FROM user_track_progress utp
      JOIN tracks t ON t.id = utp.track_id
      WHERE utp.user_id = $1
    `,
      [userId],
    );

    res.json({
      status: "success",
      data: {
        user: userRes.rows[0],
        badges: badgesRes.rows,
        submissions: subsRes.rows,
        tracks: trackRes.rows,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/users/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// PATCH /api/admin/users/:id
// Lets an admin update a user's role and/or verified status.
// Body: { user_role?: string, is_verified?: boolean }
// Only these two fields are allowed through this endpoint to prevent
// accidental overwrites of other user data.
router.patch("/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId)
    return res
      .status(400)
      .json({ status: "error", message: "Invalid user id" });

  const ALLOWED = ["user_role", "is_verified"];
  const updates = [];
  const values = [];

  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) {
      values.push(req.body[key]);
      updates.push(`${key} = $${values.length}`);
    }
  }

  if (!updates.length) {
    return res
      .status(400)
      .json({ status: "error", message: "No valid fields to update" });
  }

  // Prevent admin from demoting themselves accidentally
  if (
    req.body.user_role &&
    req.body.user_role !== "admin" &&
    userId === req.user.id
  ) {
    return res
      .status(400)
      .json({ status: "error", message: "You cannot demote your own account" });
  }

  values.push(userId);
  try {
    await db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${values.length}`,
      values,
    );
    res.json({ status: "success", message: "User updated" });
  } catch (err) {
    console.error("PATCH /api/admin/users/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// DELETE /api/admin/users/:id
// Hard-deletes a user and all their associated data via CASCADE.
// Make sure your FK constraints have ON DELETE CASCADE set, otherwise
// you will need to manually delete from submissions, user_badges, etc. first.
// An admin cannot delete their own account through this endpoint.
router.delete("/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId)
    return res
      .status(400)
      .json({ status: "error", message: "Invalid user id" });

  if (userId === req.user.id) {
    return res
      .status(400)
      .json({ status: "error", message: "You cannot delete your own account" });
  }

  try {
    const result = await db.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [userId],
    );
    if (!result.rowCount) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }
    res.json({ status: "success", message: "User deleted" });
  } catch (err) {
    console.error("DELETE /api/admin/users/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/admin/notes
// Returns the admin's private scratchpad stored as profile_readme on their own user row.
// We reuse the existing profile_readme column — no new DB column needed.
// If you ever want separate storage, add an admin_notes column to users.
router.get("/notes", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT profile_readme FROM users WHERE id = $1",
      [req.user.id],
    );
    res.json({
      status: "success",
      data: { notes: rows[0]?.profile_readme || "" },
    });
  } catch (err) {
    console.error("GET /api/admin/notes", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// PATCH /api/admin/notes
// Saves the admin's private notes. Body: { notes: string }
router.patch("/notes", async (req, res) => {
  const notes = typeof req.body.notes === "string" ? req.body.notes : "";
  try {
    await db.query("UPDATE users SET profile_readme = $1 WHERE id = $2", [
      notes || null,
      req.user.id,
    ]);
    res.json({ status: "success", message: "Notes saved" });
  } catch (err) {
    console.error("PATCH /api/admin/notes", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

export default router;
