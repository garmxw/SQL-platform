import { Router } from "express";
import { db } from "#shared/config/db.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";
import { authorizeRoles } from "#server/middleware/roleMiddleware.js";

const router = new Router();

// Apply auth + admin check to every route in this file
router.use(authenticateToken, authorizeRoles("admin"));

// TRACKS

// GET /api/admin/tracks
// Returns all tracks with lesson count and exam status.
router.get("/tracks", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        t.*,
        COUNT(DISTINCT l.id)            AS lesson_count,
        te.id                            AS exam_id,
        te.is_published                  AS exam_published
      FROM tracks t
      LEFT JOIN lessons l  ON l.track_id = t.id
      LEFT JOIN track_exams te ON te.track_id = t.id
      GROUP BY t.id, te.id, te.is_published
      ORDER BY t.track_order ASC, t.created_at ASC
    `);
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("GET /api/content/tracks", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/content/tracks
// Create a new track.
router.post("/tracks", async (req, res) => {
  const {
    title,
    description,
    difficulty,
    track_order,
    pass_threshold,
    cert_threshold,
    cover_image_url,
    prerequisite_track_id,
    is_published,
  } = req.body;

  if (!title)
    return res
      .status(400)
      .json({ status: "error", message: "title is required" });

  try {
    const { rows } = await db.query(
      `
      INSERT INTO tracks
        (title, description, difficulty, track_order, pass_threshold,
         cert_threshold, cover_image_url, prerequisite_track_id, is_published)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `,
      [
        title,
        description || null,
        difficulty || "beginner",
        track_order ?? 0,
        pass_threshold ?? 85,
        cert_threshold ?? 90,
        cover_image_url || null,
        prerequisite_track_id || null,
        is_published ?? false,
      ],
    );
    res.status(201).json({ status: "success", data: rows[0] });
  } catch (err) {
    console.error("POST /api/content/tracks", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// PATCH /api/content/tracks/:id
// Update any subset of track fields.
router.patch("/tracks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const ALLOWED = [
    "title",
    "description",
    "difficulty",
    "track_order",
    "pass_threshold",
    "cert_threshold",
    "cover_image_url",
    "prerequisite_track_id",
    "is_published",
  ];
  const sets = [];
  const vals = [];
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) {
      vals.push(req.body[k]);
      sets.push(`${k} = $${vals.length}`);
    }
  }
  if (!sets.length)
    return res
      .status(400)
      .json({ status: "error", message: "No fields to update" });
  vals.push(id);
  try {
    const { rows } = await db.query(
      `UPDATE tracks SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`,
      vals,
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ status: "error", message: "Track not found" });
    res.json({ status: "success", data: rows[0] });
  } catch (err) {
    console.error("PATCH /api/content/tracks/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// DELETE /api/content/tracks/:id
router.delete("/tracks/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { rowCount } = await db.query("DELETE FROM tracks WHERE id=$1", [id]);
    if (!rowCount)
      return res
        .status(404)
        .json({ status: "error", message: "Track not found" });
    res.json({ status: "success" });
  } catch (err) {
    console.error("DELETE /api/content/tracks/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// LESSONS

// GET /api/content/lessons?track_id=N
// Returns lessons for a track (or all if no track_id given),
// with their linked problem id if one exists.
router.get("/lessons", async (req, res) => {
  const { track_id } = req.query;
  const cond = track_id ? "WHERE l.track_id = $1" : "";
  const vals = track_id ? [Number(track_id)] : [];
  try {
    const { rows } = await db.query(
      `
      SELECT
        l.*,
        p.id        AS problem_id,
        p.title     AS problem_title,
        p.difficulty AS problem_difficulty
      FROM lessons l
      LEFT JOIN problems p ON p.lesson_id = l.id AND p.is_standalone = false
      ${cond}
      ORDER BY l.lesson_order ASC
    `,
      vals,
    );
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("GET /api/content/lessons", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/content/lessons/:id
// Full lesson detail including its embedded problem and hints.
router.get("/lessons/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const lessonRes = await db.query("SELECT * FROM lessons WHERE id=$1", [id]);
    if (!lessonRes.rows.length)
      return res
        .status(404)
        .json({ status: "error", message: "Lesson not found" });

    const problemRes = await db.query(
      `
      SELECT p.*, array_agg(ph.content ORDER BY ph.hint_order) FILTER (WHERE ph.id IS NOT NULL) AS hints_arr
      FROM problems p
      LEFT JOIN problem_hints ph ON ph.problem_id = p.id
      WHERE p.lesson_id = $1 AND p.is_standalone = false
      GROUP BY p.id
    `,
      [id],
    );

    res.json({
      status: "success",
      data: { lesson: lessonRes.rows[0], problem: problemRes.rows[0] || null },
    });
  } catch (err) {
    console.error("GET /api/content/lessons/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/content/lessons
// Creates a lesson and its linked embedded problem in one request.
// Body shape:
// {
//   track_id, title, content (markdown), lesson_order, demo_sql, xp_reward,
//   hint_xp_penalty, solution_xp_penalty, tags, is_published,
//   problem: {
//     title, description, starter_sql, solution_sql (array of strings),
//     difficulty, xp_reward, order_matters, schema_sql,
//     hint_xp_penalty, solution_xp_penalty,
//     hints: [{ hint_order, content, xp_penalty }],
//     solution_explanation
//   }
// }
router.post("/lessons", async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const {
      track_id,
      title,
      content,
      lesson_order,
      demo_sql,
      xp_reward,
      hint_xp_penalty,
      solution_xp_penalty,
      tags,
      is_published,
      problem,
    } = req.body;

    if (!track_id || !title || !content) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        status: "error",
        message: "track_id, title, content are required",
      });
    }

    // Insert lesson
    const lessonRes = await client.query(
      `
      INSERT INTO lessons
        (track_id, title, content, lesson_order, demo_sql, xp_reward,
         hint_xp_penalty, solution_xp_penalty, tags, is_published)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `,
      [
        track_id,
        title,
        content,
        lesson_order ?? 0,
        demo_sql || null,
        xp_reward ?? 10,
        hint_xp_penalty ?? 5,
        solution_xp_penalty ?? 10,
        tags ? `{${tags.join(",")}}` : null,
        is_published ?? false,
      ],
    );
    const lesson = lessonRes.rows[0];

    let createdProblem = null;

    if (problem) {
      // Insert the embedded problem linked to this lesson
      const problemRes = await client.query(
        `
        INSERT INTO problems
          (lesson_id, title, description, starter_sql, solution_sql, difficulty,
           xp_reward, order_matters, schema_sql, hint_xp_penalty, solution_xp_penalty,
           is_standalone, is_published, tags)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,$12,$13)
        RETURNING *
      `,
        [
          lesson.id,
          problem.title || title,
          problem.description || "",
          problem.starter_sql || null,
          JSON.stringify(problem.solution_sql || []),
          problem.difficulty || "easy",
          problem.xp_reward ?? 20,
          problem.order_matters ?? false,
          problem.schema_sql || null,
          problem.hint_xp_penalty ?? hint_xp_penalty ?? 5,
          problem.solution_xp_penalty ?? solution_xp_penalty ?? 10,
          is_published ?? false,
          tags ? `{${tags.join(",")}}` : null,
        ],
      );
      createdProblem = problemRes.rows[0];

      // Insert hints
      if (problem.hints && problem.hints.length) {
        for (const h of problem.hints) {
          await client.query(
            `
            INSERT INTO problem_hints (problem_id, hint_order, content, xp_penalty)
            VALUES ($1,$2,$3,$4)
          `,
            [
              createdProblem.id,
              h.hint_order ?? 1,
              h.content,
              h.xp_penalty ?? problem.hint_xp_penalty ?? 5,
            ],
          );
        }
      }

      // Insert solution explanation
      if (
        problem.solution_explanation ||
        (problem.solution_sql && problem.solution_sql.length)
      ) {
        await client.query(
          `
          INSERT INTO problem_solutions (problem_id, explanation, sql_text)
          VALUES ($1,$2,$3)
        `,
          [
            createdProblem.id,
            problem.solution_explanation || null,
            Array.isArray(problem.solution_sql)
              ? problem.solution_sql[0]
              : problem.solution_sql || "",
          ],
        );
      }
    }

    await client.query("COMMIT");
    res
      .status(201)
      .json({ status: "success", data: { lesson, problem: createdProblem } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/content/lessons", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  } finally {
    client.release();
  }
});

// PATCH /api/content/lessons/:id
// Update lesson fields. To update the linked problem, send a `problem` key.
// To update hints, send `problem.hints` as the FULL replacement list
// (old hints are deleted and replaced).
router.patch("/lessons/:id", async (req, res) => {
  const id = Number(req.params.id);
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const LESSON_ALLOWED = [
      "track_id",
      "title",
      "content",
      "lesson_order",
      "demo_sql",
      "xp_reward",
      "hint_xp_penalty",
      "solution_xp_penalty",
      "tags",
      "is_published",
    ];
    const sets = [];
    const vals = [];
    for (const k of LESSON_ALLOWED) {
      if (req.body[k] !== undefined) {
        const v = k === "tags" ? `{${req.body[k].join(",")}}` : req.body[k];
        vals.push(v);
        sets.push(`${k} = $${vals.length}`);
      }
    }
    let lesson = null;
    if (sets.length) {
      vals.push(id);
      const { rows } = await client.query(
        `UPDATE lessons SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`,
        vals,
      );
      if (!rows.length) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ status: "error", message: "Lesson not found" });
      }
      lesson = rows[0];
    }

    // Update linked problem if provided
    if (req.body.problem) {
      const p = req.body.problem;
      const PROB_ALLOWED = [
        "title",
        "description",
        "starter_sql",
        "solution_sql",
        "difficulty",
        "xp_reward",
        "order_matters",
        "schema_sql",
        "hint_xp_penalty",
        "solution_xp_penalty",
        "is_published",
      ];
      const psets = [];
      const pvals = [];
      for (const k of PROB_ALLOWED) {
        if (p[k] !== undefined) {
          const v = k === "solution_sql" ? JSON.stringify(p[k]) : p[k];
          pvals.push(v);
          psets.push(`${k} = $${pvals.length}`);
        }
      }
      if (psets.length) {
        pvals.push(id);
        await client.query(
          `UPDATE problems SET ${psets.join(",")} WHERE lesson_id=$${pvals.length} AND is_standalone=false`,
          pvals,
        );
      }

      // Replace hints if provided
      if (Array.isArray(p.hints)) {
        const probRow = await client.query(
          "SELECT id FROM problems WHERE lesson_id=$1 AND is_standalone=false LIMIT 1",
          [id],
        );
        if (probRow.rows.length) {
          const pid = probRow.rows[0].id;
          await client.query("DELETE FROM problem_hints WHERE problem_id=$1", [
            pid,
          ]);
          for (const h of p.hints) {
            await client.query(
              `INSERT INTO problem_hints (problem_id, hint_order, content, xp_penalty) VALUES ($1,$2,$3,$4)`,
              [pid, h.hint_order ?? 1, h.content, h.xp_penalty ?? 5],
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    res.json({ status: "success", data: { lesson } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PATCH /api/content/lessons/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/content/lessons/:id
// Cascades to the linked embedded problem via DB foreign key.
router.delete("/lessons/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { rowCount } = await db.query("DELETE FROM lessons WHERE id=$1", [
      id,
    ]);
    if (!rowCount)
      return res
        .status(404)
        .json({ status: "error", message: "Lesson not found" });
    res.json({ status: "success" });
  } catch (err) {
    console.error("DELETE /api/content/lessons/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// STANDALONE PROBLEMS (Problems page)

// GET /api/content/problems
// Returns standalone problems with tag and hint count.
router.get("/problems", async (req, res) => {
  const { search = "", difficulty = "", page = "1", limit = "20" } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(Number(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;
  const conds = ["p.is_standalone = true"];
  const vals = [];
  if (search) {
    vals.push(`%${search}%`);
    conds.push(
      `(p.title ILIKE $${vals.length} OR p.description ILIKE $${vals.length})`,
    );
  }
  if (difficulty) {
    vals.push(difficulty);
    conds.push(`p.difficulty = $${vals.length}`);
  }
  const where = `WHERE ${conds.join(" AND ")}`;
  try {
    const countRes = await db.query(
      `SELECT COUNT(*) FROM problems p ${where}`,
      vals,
    );
    const total = Number(countRes.rows[0].count);
    const dataRes = await db.query(
      `
      SELECT p.*,
        COUNT(DISTINCT ph.id) AS hint_count,
        COUNT(DISTINCT ps.id) AS solution_count
      FROM problems p
      LEFT JOIN problem_hints ph ON ph.problem_id = p.id
      LEFT JOIN problem_solutions ps ON ps.problem_id = p.id
      ${where}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}
    `,
      [...vals, limitNum, offset],
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
    console.error("GET /api/content/problems", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/content/problems/:id
// Full problem detail including hints and solution.
router.get("/problems/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const pRes = await db.query("SELECT * FROM problems WHERE id=$1", [id]);
    if (!pRes.rows.length)
      return res
        .status(404)
        .json({ status: "error", message: "Problem not found" });
    const hintsRes = await db.query(
      "SELECT * FROM problem_hints WHERE problem_id=$1 ORDER BY hint_order ASC",
      [id],
    );
    const solRes = await db.query(
      "SELECT * FROM problem_solutions WHERE problem_id=$1",
      [id],
    );
    res.json({
      status: "success",
      data: {
        problem: pRes.rows[0],
        hints: hintsRes.rows,
        solutions: solRes.rows,
      },
    });
  } catch (err) {
    console.error("GET /api/content/problems/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/content/problems
// Create a new standalone problem.
router.post("/problems", async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const {
      title,
      description,
      starter_sql,
      solution_sql,
      difficulty,
      xp_reward,
      order_matters,
      schema_sql,
      hint_xp_penalty,
      solution_xp_penalty,
      time_limit_seconds,
      tags,
      is_published,
      hints,
      solution_explanation,
    } = req.body;
    if (!title || !description) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        status: "error",
        message: "title and description are required",
      });
    }
    const pRes = await client.query(
      `
      INSERT INTO problems
        (title, description, starter_sql, solution_sql, difficulty, xp_reward,
         order_matters, schema_sql, hint_xp_penalty, solution_xp_penalty,
         time_limit_seconds, tags, is_standalone, is_published)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13)
      RETURNING *
    `,
      [
        title,
        description,
        starter_sql || null,
        JSON.stringify(solution_sql || []),
        difficulty || "medium",
        xp_reward ?? 20,
        order_matters ?? false,
        schema_sql || null,
        hint_xp_penalty ?? 5,
        solution_xp_penalty ?? 10,
        time_limit_seconds || null,
        tags ? `{${tags.join(",")}}` : null,
        is_published ?? false,
      ],
    );
    const prob = pRes.rows[0];

    if (hints && hints.length) {
      for (const h of hints) {
        await client.query(
          `INSERT INTO problem_hints (problem_id, hint_order, content, xp_penalty) VALUES ($1,$2,$3,$4)`,
          [
            prob.id,
            h.hint_order ?? 1,
            h.content,
            h.xp_penalty ?? hint_xp_penalty ?? 5,
          ],
        );
      }
    }
    if (solution_explanation || (solution_sql && solution_sql.length)) {
      const sqlText = Array.isArray(solution_sql)
        ? solution_sql[0]
        : solution_sql || "";
      await client.query(
        `INSERT INTO problem_solutions (problem_id, explanation, sql_text) VALUES ($1,$2,$3)`,
        [prob.id, solution_explanation || null, sqlText],
      );
    }
    await client.query("COMMIT");
    res.status(201).json({ status: "success", data: prob });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/content/problems", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  } finally {
    client.release();
  }
});

// PATCH /api/content/problems/:id
// Update a standalone problem. Sending `hints` replaces all existing hints.
router.patch("/problems/:id", async (req, res) => {
  const id = Number(req.params.id);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const ALLOWED = [
      "title",
      "description",
      "starter_sql",
      "solution_sql",
      "difficulty",
      "xp_reward",
      "order_matters",
      "schema_sql",
      "hint_xp_penalty",
      "solution_xp_penalty",
      "time_limit_seconds",
      "tags",
      "is_published",
      "is_standalone",
    ];
    const sets = [];
    const vals = [];
    for (const k of ALLOWED) {
      if (req.body[k] !== undefined) {
        const v =
          k === "solution_sql"
            ? JSON.stringify(req.body[k])
            : k === "tags"
              ? `{${req.body[k].join(",")}}`
              : req.body[k];
        vals.push(v);
        sets.push(`${k} = $${vals.length}`);
      }
    }
    if (sets.length) {
      vals.push(id);
      const { rows } = await client.query(
        `UPDATE problems SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`,
        vals,
      );
      if (!rows.length) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ status: "error", message: "Problem not found" });
      }
    }
    if (Array.isArray(req.body.hints)) {
      await client.query("DELETE FROM problem_hints WHERE problem_id=$1", [id]);
      for (const h of req.body.hints) {
        await client.query(
          `INSERT INTO problem_hints (problem_id, hint_order, content, xp_penalty) VALUES ($1,$2,$3,$4)`,
          [id, h.hint_order ?? 1, h.content, h.xp_penalty ?? 5],
        );
      }
    }
    await client.query("COMMIT");
    res.json({ status: "success" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PATCH /api/content/problems/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/content/problems/:id
router.delete("/problems/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { rowCount } = await db.query("DELETE FROM problems WHERE id=$1", [
      id,
    ]);
    if (!rowCount)
      return res
        .status(404)
        .json({ status: "error", message: "Problem not found" });
    res.json({ status: "success" });
  } catch (err) {
    console.error("DELETE /api/content/problems/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// BADGES

// GET /api/content/badges
router.get("/badges", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM badges ORDER BY created_at DESC",
    );
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("GET /api/content/badges", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/content/badges
router.post("/badges", async (req, res) => {
  const {
    name,
    code,
    description,
    icon_url,
    xp_reward,
    rarity,
    criteria_json,
    is_active,
  } = req.body;
  if (!name || !code)
    return res
      .status(400)
      .json({ status: "error", message: "name and code are required" });
  try {
    const { rows } = await db.query(
      `
      INSERT INTO badges (name, code, description, icon_url, xp_reward, rarity, criteria_json, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `,
      [
        name,
        code,
        description || null,
        icon_url || null,
        xp_reward ?? 0,
        rarity || "common",
        criteria_json ? JSON.stringify(criteria_json) : null,
        is_active ?? true,
      ],
    );
    res.status(201).json({ status: "success", data: rows[0] });
  } catch (err) {
    console.error("POST /api/content/badges", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// PATCH /api/content/badges/:id
router.patch("/badges/:id", async (req, res) => {
  const id = Number(req.params.id);
  const ALLOWED = [
    "name",
    "code",
    "description",
    "icon_url",
    "xp_reward",
    "rarity",
    "criteria_json",
    "is_active",
  ];
  const sets = [];
  const vals = [];
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) {
      const v =
        k === "criteria_json" ? JSON.stringify(req.body[k]) : req.body[k];
      vals.push(v);
      sets.push(`${k} = $${vals.length}`);
    }
  }
  if (!sets.length)
    return res.status(400).json({ status: "error", message: "No fields" });
  vals.push(id);
  try {
    const { rows } = await db.query(
      `UPDATE badges SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`,
      vals,
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ status: "error", message: "Badge not found" });
    res.json({ status: "success", data: rows[0] });
  } catch (err) {
    console.error("PATCH /api/content/badges/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// DELETE /api/content/badges/:id
router.delete("/badges/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db.query("DELETE FROM badges WHERE id=$1", [id]);
    res.json({ status: "success" });
  } catch (err) {
    console.error("DELETE /api/content/badges/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// TRACK EXAMS

// GET /api/content/exams?track_id=N
router.get("/exams", async (req, res) => {
  const { track_id } = req.query;
  const cond = track_id ? "WHERE te.track_id=$1" : "";
  const vals = track_id ? [Number(track_id)] : [];
  try {
    const { rows } = await db.query(
      `
      SELECT te.*, t.title AS track_title,
        COUNT(DISTINCT eq.id) AS question_count
      FROM track_exams te
      JOIN tracks t ON t.id = te.track_id
      LEFT JOIN exam_questions eq ON eq.exam_id = te.id
      ${cond}
      GROUP BY te.id, t.title
      ORDER BY te.created_at DESC
    `,
      vals,
    );
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("GET /api/content/exams", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/content/exams/:id
// Full exam with questions and choices.
router.get("/exams/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const examRes = await db.query("SELECT * FROM track_exams WHERE id=$1", [
      id,
    ]);
    if (!examRes.rows.length)
      return res
        .status(404)
        .json({ status: "error", message: "Exam not found" });
    const qRes = await db.query(
      `
      SELECT eq.*, json_agg(ec ORDER BY ec.choice_order) FILTER (WHERE ec.id IS NOT NULL) AS choices
      FROM exam_questions eq
      LEFT JOIN exam_choices ec ON ec.question_id = eq.id
      WHERE eq.exam_id=$1
      GROUP BY eq.id
      ORDER BY eq.question_order ASC
    `,
      [id],
    );
    res.json({
      status: "success",
      data: { exam: examRes.rows[0], questions: qRes.rows },
    });
  } catch (err) {
    console.error("GET /api/content/exams/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/content/exams
// Create a new exam for a track (one exam per track enforced by UNIQUE constraint).
// Body: { track_id, title, description, time_limit_seconds, pass_threshold, cert_threshold, is_published }
router.post("/exams", async (req, res) => {
  const {
    track_id,
    title,
    description,
    time_limit_seconds,
    pass_threshold,
    cert_threshold,
    is_published,
  } = req.body;
  if (!track_id || !title)
    return res
      .status(400)
      .json({ status: "error", message: "track_id and title are required" });
  try {
    const { rows } = await db.query(
      `
      INSERT INTO track_exams (track_id, title, description, time_limit_seconds, pass_threshold, cert_threshold, is_published)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `,
      [
        track_id,
        title,
        description || null,
        time_limit_seconds ?? 3600,
        pass_threshold ?? 85,
        cert_threshold ?? 90,
        is_published ?? false,
      ],
    );
    res.status(201).json({ status: "success", data: rows[0] });
  } catch (err) {
    if (err.code === "23505")
      return res
        .status(409)
        .json({ status: "error", message: "This track already has an exam" });
    console.error("POST /api/content/exams", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// PATCH /api/content/exams/:id
router.patch("/exams/:id", async (req, res) => {
  const id = Number(req.params.id);
  const ALLOWED = [
    "title",
    "description",
    "time_limit_seconds",
    "pass_threshold",
    "cert_threshold",
    "is_published",
    "total_points",
  ];
  const sets = [];
  const vals = [];
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) {
      vals.push(req.body[k]);
      sets.push(`${k}=$${vals.length}`);
    }
  }
  if (!sets.length)
    return res.status(400).json({ status: "error", message: "No fields" });
  vals.push(id);
  try {
    const { rows } = await db.query(
      `UPDATE track_exams SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`,
      vals,
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ status: "error", message: "Exam not found" });
    res.json({ status: "success", data: rows[0] });
  } catch (err) {
    console.error("PATCH /api/content/exams/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/content/exams/:id/questions
// Add a question (and its choices) to an exam.
// Body: { question_order, question_type, question_text, points, linked_problem_id?, choices: [{choice_text, is_correct, choice_order}] }
router.post("/exams/:examId/questions", async (req, res) => {
  const examId = Number(req.params.examId);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const {
      question_order,
      question_type,
      question_text,
      points,
      linked_problem_id,
      choices,
    } = req.body;
    if (!question_text) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ status: "error", message: "question_text required" });
    }
    const qRes = await client.query(
      `
      INSERT INTO exam_questions (exam_id, question_order, question_type, question_text, points, linked_problem_id)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `,
      [
        examId,
        question_order ?? 1,
        question_type || "multiple_choice",
        question_text,
        points ?? 10,
        linked_problem_id || null,
      ],
    );
    const q = qRes.rows[0];
    if (choices && choices.length) {
      for (const c of choices) {
        await client.query(
          `INSERT INTO exam_choices (question_id, choice_text, is_correct, choice_order) VALUES ($1,$2,$3,$4)`,
          [q.id, c.choice_text, c.is_correct ?? false, c.choice_order ?? 1],
        );
      }
    }
    // Recalculate total_points on the exam
    await client.query(
      `UPDATE track_exams SET total_points = (SELECT COALESCE(SUM(points),0) FROM exam_questions WHERE exam_id=$1) WHERE id=$1`,
      [examId],
    );
    await client.query("COMMIT");
    res.status(201).json({ status: "success", data: q });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/content/exams/:id/questions", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/content/questions/:id
// Deletes a question and recalculates exam total_points.
router.delete("/questions/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const qRow = await db.query(
      "DELETE FROM exam_questions WHERE id=$1 RETURNING exam_id",
      [id],
    );
    if (qRow.rows.length) {
      const examId = qRow.rows[0].exam_id;
      await db.query(
        `UPDATE track_exams SET total_points = (SELECT COALESCE(SUM(points),0) FROM exam_questions WHERE exam_id=$1) WHERE id=$1`,
        [examId],
      );
    }
    res.json({ status: "success" });
  } catch (err) {
    console.error("DELETE /api/content/questions/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

export default router;
