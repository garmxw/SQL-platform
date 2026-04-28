/**
 * leaderboard.routes.js — v2
 *
 * Changes from v1:
 *  - All boards filter WHERE u.user_role = 'student'
 *  - /summary returns the caller's actual per-type score (XP, solved count,
 *    streak days, acceptance rate, badge count) so the frontend cards show
 *    real stats, not just rank position
 *  - Rank is computed within the student pool only
 *
 * Ranking systems:
 *  xp       — users.xp
 *  solved   — distinct problems solved correctly
 *  streak   — users.current_streak
 *  quality  — acceptance rate (min 10 submissions)
 *  badges   — count of earned badges
 */

import { Router } from "express";
import { db } from "#shared/config/db.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";

const router = Router();

const VALID_TYPES = ["xp", "solved", "streak", "quality", "badges"];
const MIN_SUBS_FOR_QUALITY = 10;

// Only verified students appear on the leaderboard
const ROLE_FILTER = `u.user_role = 'student' AND u.is_verified = true AND u.username IS NOT NULL`;

// ── Board configs ────────────────────────────────────────────────────────────

function getBoardConfig(type) {
  switch (type) {
    case "xp":
      return {
        cte: null,
        join: "",
        scoreExpr: `u.xp`,
        extraCols: `u.xp AS score, u.level, u.current_streak`,
        metaLabel: "XP",
      };
    case "solved":
      return {
        cte: `
          solved_counts AS (
            SELECT sp.user_id, COUNT(DISTINCT sp.problem_id)::int AS solved_count
            FROM (
              SELECT user_id, problem_id FROM user_problem_state WHERE is_solved = true
              UNION
              SELECT user_id, problem_id FROM submissions WHERE is_correct = true
            ) sp
            GROUP BY sp.user_id
          )`,
        join: `LEFT JOIN solved_counts sc ON sc.user_id = u.id`,
        scoreExpr: `COALESCE(sc.solved_count, 0)`,
        extraCols: `COALESCE(sc.solved_count, 0) AS score, u.level, u.xp`,
        metaLabel: "Solved",
      };
    case "streak":
      return {
        cte: null,
        join: "",
        scoreExpr: `u.current_streak`,
        extraCols: `u.current_streak AS score, u.longest_streak, u.level, u.xp`,
        metaLabel: "Day Streak",
      };
    case "quality":
      return {
        cte: `
          quality_stats AS (
            SELECT
              user_id,
              COUNT(*)::int AS total_subs,
              COUNT(*) FILTER (WHERE is_correct = true)::int AS correct_subs,
              ROUND(COUNT(*) FILTER (WHERE is_correct = true)::numeric / COUNT(*) * 100, 1) AS acceptance_rate
            FROM submissions
            GROUP BY user_id
            HAVING COUNT(*) >= ${MIN_SUBS_FOR_QUALITY}
          )`,
        join: `INNER JOIN quality_stats qs ON qs.user_id = u.id`,
        scoreExpr: `COALESCE(qs.acceptance_rate, 0)`,
        extraCols: `COALESCE(qs.acceptance_rate, 0) AS score, COALESCE(qs.total_subs, 0) AS total_subs, COALESCE(qs.correct_subs, 0) AS correct_subs, u.level, u.xp`,
        metaLabel: "% Acceptance",
      };
    case "badges":
      return {
        cte: `
          badge_counts AS (
            SELECT user_id, COUNT(*)::int AS badge_count
            FROM user_badges GROUP BY user_id
          )`,
        join: `LEFT JOIN badge_counts bc ON bc.user_id = u.id`,
        scoreExpr: `COALESCE(bc.badge_count, 0)`,
        extraCols: `COALESCE(bc.badge_count, 0) AS score, u.level, u.xp`,
        metaLabel: "Badges",
      };
    default:
      return null;
  }
}

function normaliseRow(type, row) {
  const base = {
    rank: parseInt(row.rank, 10),
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    avatarUrl: row.avatar_url || null,
    level: parseInt(row.level, 10) || 1,
    xp: parseInt(row.xp, 10) || 0,
    score: 0,
    meta: {},
  };
  switch (type) {
    case "xp":
      base.score = parseInt(row.score, 10) || 0;
      base.meta = { currentStreak: parseInt(row.current_streak, 10) || 0 };
      break;
    case "solved":
      base.score = parseInt(row.score, 10) || 0;
      break;
    case "streak":
      base.score = parseInt(row.score, 10) || 0;
      base.meta = { longestStreak: parseInt(row.longest_streak, 10) || 0 };
      break;
    case "quality":
      base.score = parseFloat(row.score) || 0;
      base.meta = {
        totalSubs: parseInt(row.total_subs, 10) || 0,
        correctSubs: parseInt(row.correct_subs, 10) || 0,
      };
      break;
    case "badges":
      base.score = parseInt(row.score, 10) || 0;
      break;
  }
  return base;
}

// ── Fetch caller's actual stats across all board types ───────────────────────

async function getMyRawStats(userId) {
  const [userRow, solvedRow, qualityRow, badgesRow] = await Promise.all([
    db.query(
      `SELECT xp, level, current_streak, longest_streak, login_streak FROM users WHERE id = $1`,
      [userId],
    ),
    db.query(
      `SELECT COUNT(DISTINCT problem_id)::int AS solved_count
       FROM (
         SELECT problem_id FROM user_problem_state WHERE user_id = $1 AND is_solved = true
         UNION
         SELECT problem_id FROM submissions WHERE user_id = $1 AND is_correct = true
       ) x`,
      [userId],
    ),
    db.query(
      `SELECT
         COUNT(*)::int AS total_subs,
         COUNT(*) FILTER (WHERE is_correct = true)::int AS correct_subs,
         CASE WHEN COUNT(*) > 0
           THEN ROUND(COUNT(*) FILTER (WHERE is_correct = true)::numeric / COUNT(*) * 100, 1)
           ELSE 0
         END AS acceptance_rate
       FROM submissions WHERE user_id = $1`,
      [userId],
    ),
    db.query(
      `SELECT COUNT(*)::int AS badge_count FROM user_badges WHERE user_id = $1`,
      [userId],
    ),
  ]);

  const u = userRow.rows[0] || {};
  const s = solvedRow.rows[0] || {};
  const q = qualityRow.rows[0] || {};
  const b = badgesRow.rows[0] || {};

  return {
    xp: {
      score: parseInt(u.xp, 10) || 0,
      level: parseInt(u.level, 10) || 1,
      meta: { currentStreak: parseInt(u.current_streak, 10) || 0 },
    },
    solved: {
      score: parseInt(s.solved_count, 10) || 0,
      meta: {},
    },
    streak: {
      score: parseInt(u.current_streak, 10) || 0,
      meta: { longestStreak: parseInt(u.longest_streak, 10) || 0 },
    },
    quality: {
      score: parseFloat(q.acceptance_rate) || 0,
      qualified: (parseInt(q.total_subs, 10) || 0) >= MIN_SUBS_FOR_QUALITY,
      meta: {
        totalSubs: parseInt(q.total_subs, 10) || 0,
        correctSubs: parseInt(q.correct_subs, 10) || 0,
      },
    },
    badges: {
      score: parseInt(b.badge_count, 10) || 0,
      meta: {},
    },
  };
}

// ── Rank of caller within the student pool for one board type ────────────────

async function getMyRank(type, userId) {
  const cfg = getBoardConfig(type);
  if (!cfg) return { rank: null, totalRanked: 0 };

  const withClause = cfg.cte ? `WITH ${cfg.cte}` : "";

  const [ranked, counted] = await Promise.all([
    db.query(
      `${withClause}
       SELECT u.id, RANK() OVER (ORDER BY ${cfg.scoreExpr} DESC NULLS LAST)::int AS rank
       FROM users u ${cfg.join}
       WHERE ${ROLE_FILTER}`,
    ),
    db.query(
      `${withClause}
       SELECT COUNT(*)::int AS total FROM users u ${cfg.join}
       WHERE ${ROLE_FILTER}`,
    ),
  ]);

  const myRow = ranked.rows.find((r) => String(r.id) === String(userId));
  const total = parseInt(counted.rows[0]?.total, 10) || 0;

  return {
    rank: myRow ? parseInt(myRow.rank, 10) : null,
    totalRanked: total,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/leaderboard?type=xp&page=1&limit=50
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", authenticateToken, async (req, res) => {
  const type = VALID_TYPES.includes(req.query.type) ? req.query.type : "xp";
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = (page - 1) * limit;
  const cfg = getBoardConfig(type);
  const withClause = cfg.cte ? `WITH ${cfg.cte}` : "";

  try {
    const [dataResult, countResult] = await Promise.all([
      db.query(
        `${withClause}
         SELECT
           u.id, u.username, u.display_name, u.avatar_url,
           ${cfg.extraCols},
           RANK() OVER (ORDER BY ${cfg.scoreExpr} DESC NULLS LAST)::int AS rank
         FROM users u ${cfg.join}
         WHERE ${ROLE_FILTER}
         ORDER BY ${cfg.scoreExpr} DESC NULLS LAST, u.id ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      db.query(
        `${withClause}
         SELECT COUNT(*)::int AS total FROM users u ${cfg.join}
         WHERE ${ROLE_FILTER}`,
      ),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    res.json({
      status: "success",
      meta: {
        type,
        label: cfg.metaLabel,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      data: dataResult.rows.map((r) => normaliseRow(type, r)),
    });
  } catch (err) {
    console.error("[GET /leaderboard]", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/leaderboard/summary
// Caller's rank + actual score on every board in one request
// ─────────────────────────────────────────────────────────────────────────────
router.get("/summary", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const [rawStats, ...rankResults] = await Promise.all([
      getMyRawStats(userId),
      ...VALID_TYPES.map((t) => getMyRank(t, userId)),
    ]);

    const summary = VALID_TYPES.map((type, i) => {
      const { rank, totalRanked } = rankResults[i] || {
        rank: null,
        totalRanked: null,
      };
      const stats = rawStats[type];
      const cfg = getBoardConfig(type);

      return {
        type,
        label: cfg.metaLabel,
        // If quality and not enough subs, rank is null even if they appear
        rank: type === "quality" && !stats.qualified ? null : rank,
        score: stats.score,
        meta: stats.meta,
        totalRanked,
        ...(type === "quality" && { qualified: stats.qualified }),
      };
    });

    res.json({ status: "success", data: summary });
  } catch (err) {
    console.error("[GET /leaderboard/summary]", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/leaderboard/me?type=xp
// ─────────────────────────────────────────────────────────────────────────────
router.get("/me", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const type = VALID_TYPES.includes(req.query.type) ? req.query.type : "xp";

  try {
    const [rankData, rawStats] = await Promise.all([
      getMyRank(type, userId),
      getMyRawStats(userId),
    ]);

    const stats = rawStats[type];
    res.json({
      status: "success",
      data: {
        type,
        rank: rankData.rank,
        score: stats.score,
        meta: stats.meta,
        totalRanked: rankData.totalRanked,
      },
    });
  } catch (err) {
    console.error("[GET /leaderboard/me]", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

export default router;
