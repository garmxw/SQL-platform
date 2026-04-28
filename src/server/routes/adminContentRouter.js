import { Router } from "express";
import { db } from "#shared/config/db.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";
import { authorizeRoles } from "#server/middleware/roleMiddleware.js";

const router = new Router();

// Apply auth + admin check to every route in this file
router.use(authenticateToken, authorizeRoles("admin"));

// CONSTANTS

const SUPPORTED_DIALECTS = ["universal", "postgres", "mysql", "sqlite"];

// SHARED SQL-VARIANT HELPERS

/**
 * Upsert lesson SQL variants from a variants map.
 *
 * @param {object} client  - pg client (inside a transaction)
 * @param {number} lessonId
 * @param {object} variantsMap - e.g. { universal: "SELECT 1", postgres: "SELECT NOW()" }
 *   Pass null / undefined to skip. Pass an empty object {} to delete all variants.
 */
async function upsertLessonSqlVariants(client, lessonId, variantsMap) {
  if (variantsMap === null || variantsMap === undefined) return;

  const incoming = Object.entries(variantsMap).filter(
    ([dialect, sql]) =>
      SUPPORTED_DIALECTS.includes(dialect) &&
      typeof sql === "string" &&
      sql.trim() !== "",
  );

  // Delete dialects that are explicitly removed (key present, value empty/null)
  const toDelete = Object.entries(variantsMap)
    .filter(
      ([dialect, sql]) => SUPPORTED_DIALECTS.includes(dialect) && !sql?.trim(),
    )
    .map(([dialect]) => dialect);

  if (toDelete.length) {
    await client.query(
      `DELETE FROM lesson_sql_variants WHERE lesson_id=$1 AND dialect = ANY($2::sql_dialect[])`,
      [lessonId, toDelete],
    );
  }

  for (const [dialect, sql_text] of incoming) {
    await client.query(
      `INSERT INTO lesson_sql_variants (lesson_id, dialect, sql_text, updated_at)
       VALUES ($1, $2::sql_dialect, $3, NOW())
       ON CONFLICT (lesson_id, dialect)
       DO UPDATE SET sql_text = EXCLUDED.sql_text, updated_at = NOW()`,
      [lessonId, dialect, sql_text],
    );
  }
}

/**
 * Upsert problem SQL variants.
 *
 * @param {object} client
 * @param {number} problemId
 * @param {object} sqlVariants - shape:
 * {
 *   starter:  { universal: "...", postgres: "...", mysql: "...", sqlite: "..." },
 *   schema:   { universal: "..." },
 *   solution: {
 *     universal: ["SELECT ...", "SELECT ..."],
 *     postgres:  ["SELECT NOW()"],
 *   }
 * }
 */
async function upsertProblemSqlVariants(client, problemId, sqlVariants) {
  if (!sqlVariants) return;

  if (sqlVariants.starter !== undefined) {
    await _upsertSimpleVariants(
      client,
      problemId,
      "starter",
      sqlVariants.starter,
    );
  }

  if (sqlVariants.schema !== undefined) {
    await _upsertSimpleVariants(
      client,
      problemId,
      "schema",
      sqlVariants.schema,
    );
  }

  if (sqlVariants.solution !== undefined) {
    for (const [dialect, solutions] of Object.entries(sqlVariants.solution)) {
      if (!SUPPORTED_DIALECTS.includes(dialect)) continue;

      // Replace strategy: delete then re-insert
      await client.query(
        `DELETE FROM problem_sql_variants
         WHERE problem_id=$1 AND variant_type='solution' AND dialect=$2::sql_dialect`,
        [problemId, dialect],
      );

      if (!Array.isArray(solutions) || solutions.length === 0) continue;

      for (let i = 0; i < solutions.length; i++) {
        const sql_text = solutions[i];
        if (typeof sql_text !== "string" || !sql_text.trim()) continue;
        await client.query(
          `INSERT INTO problem_sql_variants
             (problem_id, variant_type, dialect, sql_text, sort_order, updated_at)
           VALUES ($1, 'solution', $2::sql_dialect, $3, $4, NOW())`,
          [problemId, dialect, sql_text, i],
        );
      }
    }
  }
}

/**
 * Internal helper for single-row-per-dialect variant types (starter / schema).
 * Uses DELETE + INSERT instead of ON CONFLICT to avoid partial-index issues.
 */
async function _upsertSimpleVariants(
  client,
  problemId,
  variantType,
  dialectMap,
) {
  if (!dialectMap || typeof dialectMap !== "object") return;

  for (const [dialect, sql_text] of Object.entries(dialectMap)) {
    if (!SUPPORTED_DIALECTS.includes(dialect)) continue;

    if (!sql_text?.trim()) {
      // Empty value → delete
      await client.query(
        `DELETE FROM problem_sql_variants
         WHERE problem_id=$1 AND variant_type=$2 AND dialect=$3::sql_dialect`,
        [problemId, variantType, dialect],
      );
      continue;
    }

    // Delete any existing row first, then insert — avoids ON CONFLICT partial-index issues
    await client.query(
      `DELETE FROM problem_sql_variants
       WHERE problem_id=$1 AND variant_type=$2 AND dialect=$3::sql_dialect`,
      [problemId, variantType, dialect],
    );
    await client.query(
      `INSERT INTO problem_sql_variants
         (problem_id, variant_type, dialect, sql_text, updated_at)
       VALUES ($1, $2, $3::sql_dialect, $4, NOW())`,
      [problemId, variantType, dialect, sql_text],
    );
  }
}

/**
 * Fetch all SQL variants for a lesson, grouped into an object:
 * { universal: "...", postgres: "...", ... }
 */
async function fetchLessonSqlVariants(client, lessonId) {
  const { rows } = await client.query(
    `SELECT dialect, sql_text FROM lesson_sql_variants WHERE lesson_id=$1 ORDER BY dialect`,
    [lessonId],
  );
  return rows.reduce((acc, r) => ({ ...acc, [r.dialect]: r.sql_text }), {});
}

/**
 * Fetch all SQL variants for a problem, grouped by variant_type then dialect:
 * {
 *   starter:  { universal: "..." },
 *   schema:   { universal: "..." },
 *   solution: { universal: ["...", "..."], postgres: ["..."] }
 * }
 */
async function fetchProblemSqlVariants(client_or_db, problemId) {
  const { rows } = await client_or_db.query(
    `SELECT variant_type, dialect, sql_text, sort_order
     FROM problem_sql_variants
     WHERE problem_id=$1
     ORDER BY variant_type, dialect, sort_order`,
    [problemId],
  );

  const result = { starter: {}, schema: {}, solution: {} };
  for (const r of rows) {
    if (r.variant_type === "solution") {
      if (!result.solution[r.dialect]) result.solution[r.dialect] = [];
      result.solution[r.dialect].push(r.sql_text);
    } else {
      result[r.variant_type][r.dialect] = r.sql_text;
    }
  }
  return result;
}

// ─── TRACKS ──────────────────────────────────────────────────────────────────

// GET /api/admin/tracks
router.get("/tracks", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        t.*,
        COUNT(DISTINCT l.id)   AS lesson_count,
        te.id                  AS exam_id,
        te.is_published        AS exam_published
      FROM tracks t
      LEFT JOIN lessons l      ON l.track_id = t.id
      LEFT JOIN track_exams te ON te.track_id = t.id
      GROUP BY t.id, te.id, te.is_published
      ORDER BY t.track_order ASC, t.created_at ASC
    `);
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("GET /api/admin/tracks", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/admin/tracks
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
      `INSERT INTO tracks
         (title, description, difficulty, track_order, pass_threshold,
          cert_threshold, cover_image_url, prerequisite_track_id, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
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
    console.error("POST /api/admin/tracks", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// PATCH /api/admin/tracks/:id
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
  const sets = [],
    vals = [];
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) {
      vals.push(req.body[k]);
      sets.push(`${k}=$${vals.length}`);
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
    console.error("PATCH /api/admin/tracks/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// DELETE /api/admin/tracks/:id
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
    console.error("DELETE /api/admin/tracks/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// ─── LESSONS ─────────────────────────────────────────────────────────────────

// GET /api/admin/lessons?track_id=N
router.get("/lessons", async (req, res) => {
  const { track_id } = req.query;
  const cond = track_id ? "WHERE l.track_id=$1" : "";
  const vals = track_id ? [Number(track_id)] : [];
  try {
    const { rows } = await db.query(
      `SELECT
         l.*,
         p.id          AS problem_id,
         p.title       AS problem_title,
         p.difficulty  AS problem_difficulty
       FROM lessons l
       LEFT JOIN problems p ON p.lesson_id=l.id AND p.is_standalone=false
       ${cond}
       ORDER BY l.lesson_order ASC`,
      vals,
    );

    for (const row of rows) {
      row.demo_sql_variants = await fetchLessonSqlVariants(db, row.id);
    }

    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("GET /api/admin/lessons", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/admin/lessons/:id
router.get("/lessons/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const lessonRes = await db.query("SELECT * FROM lessons WHERE id=$1", [id]);
    if (!lessonRes.rows.length)
      return res
        .status(404)
        .json({ status: "error", message: "Lesson not found" });

    const lesson = lessonRes.rows[0];
    lesson.demo_sql_variants = await fetchLessonSqlVariants(db, id);

    const problemRes = await db.query(
      `SELECT p.*, array_agg(ph.content ORDER BY ph.hint_order) FILTER (WHERE ph.id IS NOT NULL) AS hints_arr
       FROM problems p
       LEFT JOIN problem_hints ph ON ph.problem_id=p.id
       WHERE p.lesson_id=$1 AND p.is_standalone=false
       GROUP BY p.id`,
      [id],
    );

    let problem = problemRes.rows[0] || null;
    if (problem) {
      problem.sql_variants = await fetchProblemSqlVariants(db, problem.id);
    }

    res.json({ status: "success", data: { lesson, problem } });
  } catch (err) {
    console.error("GET /api/admin/lessons/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/admin/lessons
router.post("/lessons", async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const {
      track_id,
      title,
      content,
      lesson_order,
      xp_reward,
      hint_xp_penalty,
      solution_xp_penalty,
      tags,
      is_published,
      demo_sql_variants,
      description,
      learning_goals,
      objectives,
      problem,
    } = req.body;

    if (!track_id || !title || !content) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        status: "error",
        message: "track_id, title, and content are required",
      });
    }

    const lessonRes = await client.query(
      `INSERT INTO lessons
         (track_id, title, content, lesson_order, xp_reward,
          hint_xp_penalty, solution_xp_penalty, tags, is_published,
          description, learning_goals, objectives)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        track_id,
        title,
        content,
        lesson_order ?? 1,
        xp_reward ?? 10,
        hint_xp_penalty ?? 5,
        solution_xp_penalty ?? 10,
        tags ? `{${tags.join(",")}}` : null,
        is_published ?? false,
        description ?? null,
        Array.isArray(learning_goals) ? `{${learning_goals.join(",")}}` : "{}",
        Array.isArray(objectives) ? `{${objectives.join(",")}}` : "{}",
      ],
    );
    const lesson = lessonRes.rows[0];

    await upsertLessonSqlVariants(client, lesson.id, demo_sql_variants);
    lesson.demo_sql_variants = await fetchLessonSqlVariants(client, lesson.id);

    let createdProblem = null;

    if (problem) {
      const probRes = await client.query(
        `INSERT INTO problems
           (lesson_id, title, description, difficulty, xp_reward, order_matters,
            hint_xp_penalty, solution_xp_penalty,
            is_standalone, is_published, tags,
            starter_sql, solution_sql, schema_sql)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false,$9,$10,null,'[]'::jsonb,null)
         RETURNING *`,
        [
          lesson.id,
          problem.title || title,
          problem.description || "",
          problem.difficulty || "easy",
          problem.xp_reward ?? 20,
          problem.order_matters ?? false,
          problem.hint_xp_penalty ?? hint_xp_penalty ?? 5,
          problem.solution_xp_penalty ?? solution_xp_penalty ?? 10,
          is_published ?? false,
          tags ? `{${tags.join(",")}}` : null,
        ],
      );
      createdProblem = probRes.rows[0];

      await upsertProblemSqlVariants(
        client,
        createdProblem.id,
        problem.sql_variants,
      );
      createdProblem.sql_variants = await fetchProblemSqlVariants(
        client,
        createdProblem.id,
      );

      if (problem.hints?.length) {
        for (const h of problem.hints) {
          await client.query(
            `INSERT INTO problem_hints (problem_id, hint_order, content, xp_penalty, dialect)
             VALUES ($1,$2,$3,$4,$5::sql_dialect)`,
            [
              createdProblem.id,
              h.hint_order ?? 1,
              h.content,
              h.xp_penalty ?? problem.hint_xp_penalty ?? 5,
              h.dialect || null,
            ],
          );
        }
      }

      if (problem.solution_explanation) {
        await client.query(
          `INSERT INTO problem_solutions (problem_id, explanation, sql_text, dialect)
           VALUES ($1,$2,'','universal')`,
          [createdProblem.id, problem.solution_explanation],
        );
      }
    }

    await client.query("COMMIT");
    res
      .status(201)
      .json({ status: "success", data: { lesson, problem: createdProblem } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/admin/lessons", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/lessons/:id
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
      "xp_reward",
      "hint_xp_penalty",
      "solution_xp_penalty",
      "tags",
      "is_published",
      "description",
      "learning_goals",
      "objectives",
    ];
    const sets = [],
      vals = [];
    for (const k of LESSON_ALLOWED) {
      if (req.body[k] !== undefined) {
        let v = req.body[k];
        if (k === "tags" || k === "learning_goals" || k === "objectives") {
          if (Array.isArray(v)) {
            v = `{${v.join(",")}}`;
          } else if (k === "tags") {
            v = null;
          } else {
            v = "{}";
          }
        }
        vals.push(v);
        sets.push(`${k}=$${vals.length}`);
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
    } else {
      // No lesson fields to update — still need to verify it exists
      const check = await client.query("SELECT id FROM lessons WHERE id=$1", [
        id,
      ]);
      if (!check.rows.length) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ status: "error", message: "Lesson not found" });
      }
    }

    if (req.body.demo_sql_variants !== undefined) {
      await upsertLessonSqlVariants(client, id, req.body.demo_sql_variants);
    }

    if (req.body.problem) {
      const p = req.body.problem;
      const PROB_ALLOWED = [
        "title",
        "description",
        "difficulty",
        "xp_reward",
        "order_matters",
        "hint_xp_penalty",
        "solution_xp_penalty",
        "is_published",
      ];
      const psets = [],
        pvals = [];
      for (const k of PROB_ALLOWED) {
        if (p[k] !== undefined) {
          pvals.push(p[k]);
          psets.push(`${k}=$${pvals.length}`);
        }
      }
      if (psets.length) {
        pvals.push(id);
        await client.query(
          `UPDATE problems SET ${psets.join(",")} WHERE lesson_id=$${pvals.length} AND is_standalone=false`,
          pvals,
        );
      }

      if (p.sql_variants !== undefined) {
        const probRow = await client.query(
          "SELECT id FROM problems WHERE lesson_id=$1 AND is_standalone=false LIMIT 1",
          [id],
        );
        if (probRow.rows.length) {
          await upsertProblemSqlVariants(
            client,
            probRow.rows[0].id,
            p.sql_variants,
          );
        }
      }

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
              `INSERT INTO problem_hints (problem_id, hint_order, content, xp_penalty, dialect)
               VALUES ($1,$2,$3,$4,$5::sql_dialect)`,
              [
                pid,
                h.hint_order ?? 1,
                h.content,
                h.xp_penalty ?? 5,
                h.dialect || null,
              ],
            );
          }
        }
      }
    }

    await client.query("COMMIT");
    res.json({ status: "success", data: { lesson } });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PATCH /api/admin/lessons/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/lessons/:id
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
    console.error("DELETE /api/admin/lessons/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// ─── STANDALONE PROBLEMS ─────────────────────────────────────────────────────

// GET /api/admin/problems
router.get("/problems", async (req, res) => {
  const { search = "", difficulty = "", page = "1", limit = "20" } = req.query;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(Number(limit) || 20, 100);
  const offset = (pageNum - 1) * limitNum;
  const conds = ["p.is_standalone=true"];
  const vals = [];
  if (search) {
    vals.push(`%${search}%`);
    conds.push(
      `(p.title ILIKE $${vals.length} OR p.description ILIKE $${vals.length})`,
    );
  }
  if (difficulty) {
    vals.push(difficulty);
    conds.push(`p.difficulty=$${vals.length}`);
  }
  const where = `WHERE ${conds.join(" AND ")}`;
  try {
    const countRes = await db.query(
      `SELECT COUNT(*) FROM problems p ${where}`,
      vals,
    );
    const total = Number(countRes.rows[0].count);
    const dataRes = await db.query(
      `SELECT p.*,
         COUNT(DISTINCT ph.id) AS hint_count,
         COUNT(DISTINCT ps.id) AS solution_count,
         array_agg(DISTINCT psv.dialect) FILTER (WHERE psv.id IS NOT NULL) AS dialect_coverage
       FROM problems p
       LEFT JOIN problem_hints ph     ON ph.problem_id=p.id
       LEFT JOIN problem_solutions ps ON ps.problem_id=p.id
       LEFT JOIN problem_sql_variants psv ON psv.problem_id=p.id AND psv.variant_type='solution'
       ${where}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
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
    console.error("GET /api/admin/problems", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/admin/problems/:id
router.get("/problems/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const pRes = await db.query("SELECT * FROM problems WHERE id=$1", [id]);
    if (!pRes.rows.length)
      return res
        .status(404)
        .json({ status: "error", message: "Problem not found" });

    const problem = pRes.rows[0];
    problem.sql_variants = await fetchProblemSqlVariants(db, id);

    const hintsRes = await db.query(
      `SELECT * FROM problem_hints WHERE problem_id=$1 ORDER BY hint_order ASC`,
      [id],
    );
    const solRes = await db.query(
      `SELECT * FROM problem_solutions WHERE problem_id=$1`,
      [id],
    );

    res.json({
      status: "success",
      data: { problem, hints: hintsRes.rows, solutions: solRes.rows },
    });
  } catch (err) {
    console.error("GET /api/admin/problems/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/admin/problems
router.post("/problems", async (req, res) => {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const {
      title,
      description,
      difficulty,
      xp_reward,
      order_matters,
      hint_xp_penalty,
      solution_xp_penalty,
      time_limit_seconds,
      tags,
      is_published,
      sql_variants,
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
      `INSERT INTO problems
         (title, description, difficulty, xp_reward, order_matters,
          hint_xp_penalty, solution_xp_penalty, time_limit_seconds,
          tags, is_standalone, is_published,
          starter_sql, solution_sql, schema_sql)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,null,'[]'::jsonb,null)
       RETURNING *`,
      [
        title,
        description,
        difficulty || "medium",
        xp_reward ?? 20,
        order_matters ?? false,
        hint_xp_penalty ?? 5,
        solution_xp_penalty ?? 10,
        time_limit_seconds || null,
        tags ? `{${tags.join(",")}}` : null,
        is_published ?? false,
      ],
    );
    const prob = pRes.rows[0];

    await upsertProblemSqlVariants(client, prob.id, sql_variants);
    prob.sql_variants = await fetchProblemSqlVariants(client, prob.id);

    if (hints?.length) {
      for (const h of hints) {
        await client.query(
          `INSERT INTO problem_hints (problem_id, hint_order, content, xp_penalty, dialect)
           VALUES ($1,$2,$3,$4,$5::sql_dialect)`,
          [
            prob.id,
            h.hint_order ?? 1,
            h.content,
            h.xp_penalty ?? hint_xp_penalty ?? 5,
            h.dialect || null,
          ],
        );
      }
    }

    if (solution_explanation) {
      await client.query(
        `INSERT INTO problem_solutions (problem_id, explanation, sql_text, dialect)
         VALUES ($1,$2,'','universal')`,
        [prob.id, solution_explanation],
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ status: "success", data: prob });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/admin/problems", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/problems/:id
router.patch("/problems/:id", async (req, res) => {
  const id = Number(req.params.id);
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const ALLOWED = [
      "title",
      "description",
      "difficulty",
      "xp_reward",
      "order_matters",
      "hint_xp_penalty",
      "solution_xp_penalty",
      "time_limit_seconds",
      "tags",
      "is_published",
      "is_standalone",
    ];
    const sets = [],
      vals = [];
    for (const k of ALLOWED) {
      if (req.body[k] !== undefined) {
        const v = k === "tags" ? `{${req.body[k].join(",")}}` : req.body[k];
        vals.push(v);
        sets.push(`${k}=$${vals.length}`);
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

    if (req.body.sql_variants !== undefined) {
      await upsertProblemSqlVariants(client, id, req.body.sql_variants);
    }

    if (Array.isArray(req.body.hints)) {
      await client.query("DELETE FROM problem_hints WHERE problem_id=$1", [id]);
      for (const h of req.body.hints) {
        await client.query(
          `INSERT INTO problem_hints (problem_id, hint_order, content, xp_penalty, dialect)
           VALUES ($1,$2,$3,$4,$5::sql_dialect)`,
          [
            id,
            h.hint_order ?? 1,
            h.content,
            h.xp_penalty ?? 5,
            h.dialect || null,
          ],
        );
      }
    }

    await client.query("COMMIT");
    res.json({ status: "success" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PATCH /api/admin/problems/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/problems/:id
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
    console.error("DELETE /api/admin/problems/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// ─── BADGES ──────────────────────────────────────────────────────────────────

router.get("/badges", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM badges ORDER BY created_at DESC",
    );
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("GET /api/admin/badges", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

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
      `INSERT INTO badges (name, code, description, icon_url, xp_reward, rarity, criteria_json, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
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
    console.error("POST /api/admin/badges", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

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
  const sets = [],
    vals = [];
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) {
      vals.push(
        k === "criteria_json" ? JSON.stringify(req.body[k]) : req.body[k],
      );
      sets.push(`${k}=$${vals.length}`);
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
    console.error("PATCH /api/admin/badges/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

router.delete("/badges/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM badges WHERE id=$1", [Number(req.params.id)]);
    res.json({ status: "success" });
  } catch (err) {
    console.error("DELETE /api/admin/badges/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// ─── TRACK EXAMS ─────────────────────────────────────────────────────────────

// GET /api/admin/exams?track_id=N
router.get("/exams", async (req, res) => {
  const { track_id } = req.query;
  const cond = track_id ? "WHERE te.track_id=$1" : "";
  const vals = track_id ? [Number(track_id)] : [];
  try {
    const { rows } = await db.query(
      `SELECT te.*, t.title AS track_title, COUNT(DISTINCT eq.id) AS question_count
       FROM track_exams te
       JOIN tracks t ON t.id=te.track_id
       LEFT JOIN exam_questions eq ON eq.exam_id=te.id
       ${cond}
       GROUP BY te.id, t.title
       ORDER BY te.created_at DESC`,
      vals,
    );
    res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("GET /api/admin/exams", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/admin/exams/:id
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
      `SELECT eq.*,
         json_agg(ec ORDER BY ec.choice_order) FILTER (WHERE ec.id IS NOT NULL) AS choices
       FROM exam_questions eq
       LEFT JOIN exam_choices ec ON ec.question_id=eq.id
       WHERE eq.exam_id=$1
       GROUP BY eq.id
       ORDER BY eq.question_order ASC`,
      [id],
    );

    const questions = qRes.rows;
    for (const q of questions) {
      if (q.question_type === "sql" && q.linked_problem_id) {
        q.linked_problem_sql_variants = await fetchProblemSqlVariants(
          db,
          q.linked_problem_id,
        );
      }
    }

    res.json({ status: "success", data: { exam: examRes.rows[0], questions } });
  } catch (err) {
    console.error("GET /api/admin/exams/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/admin/exams
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
      `INSERT INTO track_exams (track_id, title, description, time_limit_seconds, pass_threshold, cert_threshold, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
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
    console.error("POST /api/admin/exams", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// PATCH /api/admin/exams/:id
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
  const sets = [],
    vals = [];
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
    console.error("PATCH /api/admin/exams/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/admin/exams/:examId/questions
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
      sql_variants,
      choices,
    } = req.body;

    if (!question_text) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ status: "error", message: "question_text required" });
    }

    // Verify the exam exists
    const examCheck = await client.query(
      "SELECT id FROM track_exams WHERE id=$1",
      [examId],
    );
    if (!examCheck.rows.length) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ status: "error", message: "Exam not found" });
    }

    const qType = question_type || "multiple_choice";
    let resolvedLinkedProblemId = linked_problem_id || null;

    // For SQL questions without an explicit linked_problem_id, create an anonymous problem
    if (qType === "sql" && !linked_problem_id && sql_variants) {
      const probRes = await client.query(
        `INSERT INTO problems
           (title, description, difficulty, xp_reward, order_matters,
            hint_xp_penalty, solution_xp_penalty,
            is_standalone, is_published,
            starter_sql, solution_sql, schema_sql)
         VALUES ($1,$2,'medium',0,false,5,10,false,true,null,'[]'::jsonb,null)
         RETURNING *`,
        [`Exam ${examId} – Q${question_order ?? 1}`, question_text],
      );
      resolvedLinkedProblemId = probRes.rows[0].id;
      await upsertProblemSqlVariants(
        client,
        resolvedLinkedProblemId,
        sql_variants,
      );
    }

    const qRes = await client.query(
      `INSERT INTO exam_questions (exam_id, question_order, question_type, question_text, points, linked_problem_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        examId,
        question_order ?? 1,
        qType,
        question_text,
        points ?? 10,
        resolvedLinkedProblemId,
      ],
    );
    const q = qRes.rows[0];

    if (choices?.length) {
      for (const c of choices) {
        await client.query(
          `INSERT INTO exam_choices (question_id, choice_text, is_correct, choice_order) VALUES ($1,$2,$3,$4)`,
          [q.id, c.choice_text, c.is_correct ?? false, c.choice_order ?? 1],
        );
      }
    }

    // Recalculate total_points
    await client.query(
      `UPDATE track_exams
       SET total_points=(SELECT COALESCE(SUM(points),0) FROM exam_questions WHERE exam_id=$1)
       WHERE id=$1`,
      [examId],
    );

    await client.query("COMMIT");
    res.status(201).json({ status: "success", data: q });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/admin/exams/:id/questions", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/questions/:id
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
        `UPDATE track_exams
         SET total_points=(SELECT COALESCE(SUM(points),0) FROM exam_questions WHERE exam_id=$1)
         WHERE id=$1`,
        [examId],
      );
    }
    res.json({ status: "success" });
  } catch (err) {
    console.error("DELETE /api/admin/questions/:id", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/admin/dialects
router.get("/dialects", (_req, res) => {
  res.json({ status: "success", data: SUPPORTED_DIALECTS });
});

export default router;
