import { Router } from "express";
import { db } from "#shared/config/db.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";

const router = new Router();
router.use(authenticateToken);

/**
 * GET /api/standalone-problems
 *
 * Returns all published standalone problems with user progress + tags.
 * Filtering is done client-side — one clean fetch, instant UI response.
 *
 * Response:
 * {
 *   status: "success",
 *   data: Problem[],
 *   tags: Tag[]          ← all distinct tags for filter UI
 * }
 *
 * Problem shape:
 * {
 *   id, title, description, difficulty,
 *   xpReward, timeLimitSeconds, acceptanceRate,
 *   solved: bool, attempts: number, solvedAt: string | null,
 *   tags: [{ id, name }],
 *   url: "/learning/problems/{id}"
 * }
 */
router.get("/", async (req, res) => {
  const userId = req.user?.userId;
  if (!userId)
    return res.status(401).json({ status: "error", message: "Unauthorized" });

  try {
    //  1. All published standalone problems + user progress ─
    const { rows: problems } = await db.query(
      `
      SELECT
        p.id,
        p.title,
        p.description,
        p.difficulty,
        p.xp_reward,
        p.time_limit_seconds,
        p.acceptance_rate,
        COALESCE(ups.is_solved, false) AS solved,
        COALESCE(ups.attempts,  0)     AS attempts,
        ups.solved_at
      FROM problems p
      LEFT JOIN user_problem_state ups
        ON ups.problem_id = p.id
        AND ups.user_id   = $1
      WHERE p.is_standalone = true
        AND p.is_published  = true
      ORDER BY p.id ASC
      `,
      [userId],
    );

    if (!problems.length) {
      return res.json({ status: "success", data: [], tags: [] });
    }

    const problemIds = problems.map((p) => p.id);

    //  2. Tags for those problems
    const { rows: tagLinks } = await db.query(
      `
      SELECT ptl.problem_id, pt.id AS tag_id, pt.name AS tag_name
      FROM problem_tag_links ptl
      JOIN problem_tags pt ON pt.id = ptl.tag_id
      WHERE ptl.problem_id = ANY($1::int[])
      ORDER BY pt.name ASC
      `,
      [problemIds],
    );

    //  3. All distinct tags (for filter dropdown)
    const { rows: allTags } = await db.query(`
      SELECT DISTINCT pt.id, pt.name
      FROM problem_tags pt
      JOIN problem_tag_links ptl ON ptl.tag_id  = pt.id
      JOIN problems p            ON p.id        = ptl.problem_id
      WHERE p.is_standalone = true
        AND p.is_published  = true
      ORDER BY pt.name ASC
    `);

    //  4. Index tags by problem_id
    const tagsByProblem = tagLinks.reduce((acc, row) => {
      if (!acc[row.problem_id]) acc[row.problem_id] = [];
      acc[row.problem_id].push({ id: row.tag_id, name: row.tag_name });
      return acc;
    }, {});

    //  5. Shape response
    const data = problems.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description ?? "",
      difficulty: toTitleCase(p.difficulty),
      xpReward: p.xp_reward ?? 20,
      timeLimitSeconds: p.time_limit_seconds ?? null,
      acceptanceRate: p.acceptance_rate ? Number(p.acceptance_rate) : null,
      solved: p.solved,
      attempts: Number(p.attempts),
      solvedAt: p.solved_at ?? null,
      tags: tagsByProblem[p.id] ?? [],
      url: `/learning/problems/${p.id}`,
    }));

    return res.json({ status: "success", data, tags: allTags });
  } catch (err) {
    console.error("GET /api/standalone-problems", err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

function toTitleCase(str) {
  if (!str) return "Medium";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default router;
