// routes/profileDashboard.routes.js
import { Router } from "express";
import { db } from "#shared/config/db.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";

const router = Router();

// ─────────────────────────────────────────────
// GET /api/profile/dashboard/overview
// Returns: solved stats, difficulty breakdown, badges, recent submissions (5),
//          acceptance rate, streaks (already covered by get-ProfileData),
//          skill-category radar data, heatmap data (last 365 days)
// ─────────────────────────────────────────────
router.get("/overview", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    // ── 1. Solved counts by difficulty ──────────────────────────────────────
    // Normalise difficulty to title-case in SQL so key lookup always matches
    const solvedByDifficulty = await db.query(
      `
      SELECT
        INITCAP(LOWER(p.difficulty))                    AS difficulty,
        COUNT(*) FILTER (WHERE ups.is_solved = true)    AS solved,
        COUNT(*)::int                                   AS total
      FROM problems p
      LEFT JOIN user_problem_state ups
        ON ups.problem_id = p.id
        AND ups.user_id = $1
      WHERE p.is_published = true
        AND p.is_standalone = true
      GROUP BY INITCAP(LOWER(p.difficulty))
      `,
      [userId],
    );

    const diffMap = {
      Easy: { solved: 0, total: 0 },
      Medium: { solved: 0, total: 0 },
      Hard: { solved: 0, total: 0 },
    };
    for (const row of solvedByDifficulty.rows) {
      const key = row.difficulty; // now always "Easy" / "Medium" / "Hard"
      if (diffMap[key]) {
        diffMap[key].solved = parseInt(row.solved, 10);
        diffMap[key].total = parseInt(row.total, 10);
      }
    }

    const totalSolved =
      diffMap.Easy.solved + diffMap.Medium.solved + diffMap.Hard.solved;
    const totalProblems =
      diffMap.Easy.total + diffMap.Medium.total + diffMap.Hard.total;

    // ── 2. Overall acceptance rate ───────────────────────────────────────────
    const acceptanceResult = await db.query(
      `
      SELECT
        COUNT(*)::int                               AS total_submissions,
        COUNT(*) FILTER (WHERE is_correct)::int     AS correct_submissions
      FROM submissions
      WHERE user_id = $1
      `,
      [userId],
    );
    const totalSubs = acceptanceResult.rows[0].total_submissions || 0;
    const correctSubs = acceptanceResult.rows[0].correct_submissions || 0;
    const acceptanceRate =
      totalSubs > 0 ? Math.round((correctSubs / totalSubs) * 100) : 0;

    // ── 3. User XP / level / streaks ─────────────────────────────────────────
    const userResult = await db.query(
      `SELECT xp, level, current_streak, longest_streak, login_streak
       FROM users WHERE id = $1`,
      [userId],
    );
    const userRow = userResult.rows[0] || {};

    // ── 4. Badges ────────────────────────────────────────────────────────────
    const badgesResult = await db.query(
      `
      SELECT
        b.id, b.name, b.description, b.icon_url,
        b.code, b.rarity, b.xp_reward,
        ub.earned_at
      FROM badges b
      LEFT JOIN user_badges ub
        ON ub.badge_id = b.id AND ub.user_id = $1
      WHERE b.is_active = true
      ORDER BY ub.earned_at DESC NULLS LAST, b.id ASC
      `,
      [userId],
    );

    // ── 5. Recent 5 submissions ───────────────────────────────────────────────
    const recentSubsResult = await db.query(
      `
      SELECT s.id, p.title, p.difficulty,
             s.is_correct, s.execution_time_ms, s.created_at, s.engine
      FROM submissions s
      JOIN problems p ON p.id = s.problem_id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
      LIMIT 5
      `,
      [userId],
    );

    // ── 6. Heatmap — daily submission counts last 365 days ───────────────────
    const heatmapResult = await db.query(
      `
      SELECT
        TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
        COUNT(*)::int                            AS count
      FROM submissions
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '365 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      `,
      [userId],
    );

    // ── 7. Skill radar — use problems.tags (text[] column) ───────────────────
    // Unnest the tags array directly from the problems table
    const radarResult = await db.query(
      `
      SELECT
        tag                                                  AS category,
        COUNT(*) FILTER (WHERE ups.is_solved = true)::int    AS solved,
        COUNT(*)::int                                        AS total
      FROM problems p
      CROSS JOIN LATERAL UNNEST(p.tags) AS tag
      LEFT JOIN user_problem_state ups
        ON ups.problem_id = p.id AND ups.user_id = $1
      WHERE p.is_published = true
        AND p.is_standalone = true
        AND p.tags IS NOT NULL
        AND array_length(p.tags, 1) > 0
      GROUP BY tag
      ORDER BY total DESC
      LIMIT 8
      `,
      [userId],
    );

    // ── 8. Radial chart data (% solved per difficulty) ────────────────────────
    const radialData = Object.entries(diffMap).map(
      ([name, { solved, total }]) => ({
        name,
        value: total > 0 ? Math.round((solved / total) * 100) : 0,
        solved,
        total,
      }),
    );

    return res.json({
      status: "success",
      data: {
        stats: {
          totalSolved,
          totalProblems,
          acceptanceRate,
          xp: userRow.xp ?? 0,
          level: userRow.level ?? 1,
          currentStreak: userRow.current_streak ?? 0,
          longestStreak: userRow.longest_streak ?? 0,
          loginStreak: userRow.login_streak ?? 0,
        },
        difficultyBreakdown: diffMap,
        radialData,
        badges: badgesResult.rows.map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          iconUrl: b.icon_url,
          code: b.code,
          rarity: b.rarity,
          xpReward: b.xp_reward,
          earned: b.earned_at !== null,
          earnedAt: b.earned_at,
        })),
        recentSubmissions: recentSubsResult.rows.map((s) => ({
          id: s.id,
          title: s.title,
          difficulty: s.difficulty,
          isCorrect: s.is_correct,
          executionTimeMs: s.execution_time_ms,
          createdAt: s.created_at,
          engine: s.engine,
        })),
        heatmap: heatmapResult.rows.map((r) => ({
          date: r.date,
          count: r.count,
        })),
        radarData: radarResult.rows.map((r) => ({
          category: r.category,
          solved: r.solved,
          total: r.total,
          score: r.total > 0 ? Math.round((r.solved / r.total) * 100) : 0,
        })),
      },
    });
  } catch (err) {
    console.error("[/dashboard/overview]", err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// GET /api/profile/dashboard/problems
// Returns: all published standalone problems with the user's solve status,
//          tag list for filtering
// ─────────────────────────────────────────────
router.get("/problems", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const problemsResult = await db.query(
      `
      SELECT
        p.id,
        p.title,
        INITCAP(LOWER(p.difficulty))  AS difficulty,
        p.acceptance_rate,
        p.xp_reward,
        p.tags,                        -- text[] column on problems directly
        ups.is_solved,
        ups.attempts,
        ups.solved_at,
        ups.first_attempt_at
      FROM problems p
      LEFT JOIN user_problem_state ups
        ON ups.problem_id = p.id
        AND ups.user_id = $1
      WHERE p.is_published = true
        AND p.is_standalone = true
      ORDER BY p.id ASC
      `,
      [userId],
    );

    // pg returns text[] as a JS array already in most setups,
    // but guard against the "{a,b}" string form just in case.
    const normaliseTags = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw.filter(Boolean);
      if (typeof raw === "string") {
        const inner = raw.replace(/^\{|\}$/g, "").trim();
        if (!inner) return [];
        return inner
          .split(",")
          .map((s) => s.replace(/^"|"$/g, "").trim())
          .filter(Boolean);
      }
      return [];
    };

    return res.json({
      status: "success",
      data: {
        problems: problemsResult.rows.map((p) => ({
          id: p.id,
          title: p.title,
          difficulty: p.difficulty ?? null,
          acceptanceRate: p.acceptance_rate
            ? parseFloat(p.acceptance_rate)
            : null,
          xpReward: p.xp_reward,
          tags: normaliseTags(p.tags),
          isSolved: p.is_solved ?? false,
          attempts: p.attempts ?? 0,
          solvedAt: p.solved_at ?? null,
          firstAttemptAt: p.first_attempt_at ?? null,
        })),
      },
    });
  } catch (err) {
    console.error("[/dashboard/problems]", err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

// ─────────────────────────────────────────────
// GET /api/profile/dashboard/submissions
// Returns: paginated full submission history (newest first)
// Query params: page (default 1), limit (default 20)
// ─────────────────────────────────────────────
router.get("/submissions", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(req.query.limit || "20", 10)),
  );
  const offset = (page - 1) * limit;

  try {
    const [subsResult, countResult] = await Promise.all([
      db.query(
        `
        SELECT
          s.id,
          p.title,
          p.difficulty,
          s.is_correct,
          s.submitted_sql,
          s.execution_time_ms,
          s.created_at,
          s.engine
        FROM submissions s
        JOIN problems p ON p.id = s.problem_id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
        LIMIT $2 OFFSET $3
        `,
        [userId, limit, offset],
      ),
      db.query(`SELECT COUNT(*) AS total FROM submissions WHERE user_id = $1`, [
        userId,
      ]),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);

    return res.json({
      status: "success",
      data: {
        submissions: subsResult.rows.map((s) => ({
          id: s.id,
          title: s.title,
          difficulty: s.difficulty,
          isCorrect: s.is_correct,
          submittedSql: s.submitted_sql,
          executionTimeMs: s.execution_time_ms,
          createdAt: s.created_at,
          engine: s.engine,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error("[/dashboard/submissions]", err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

export default router;
