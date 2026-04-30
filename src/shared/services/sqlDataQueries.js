import { db } from "../config/db.js";
import { parseMySQLResult } from "#server/utils/parseMysqlRaw.js";
import { parsePostgresResult } from "#server/utils/parsePostgresRaw.js";
import { parseSQLiteResult } from "#server/utils/parsesqlite.js";
import { validateQuery } from "#server/security/validateQuery.js";
import { withTimeout } from "#server/executor/timeOut.js";
import { calculateLevel } from "#server/utils/levelUtils.js";
import { resolveTemplate } from "#server/executor/templateManager.js";

// POSTGRES

async function _runPostgres(sql, schemaSQL, problemId) {
  const { runPostgres, runPostgresDDL } =
    await import("#server/executor/postgresExecutor.js");
  const runSafe = withTimeout(runPostgres, 10000);
  const runSafeDDL = withTimeout(runPostgresDDL, 10000);

  let sourceTemplate = null;
  let adHocTemplate = null;

  if (problemId) {
    sourceTemplate = await resolveTemplate(problemId, "postgres");
    if (sourceTemplate) {
      console.log(`[exec:pg] Fast path: ${sourceTemplate}`);
    } else {
      console.warn(
        `[exec:pg] No template for problem ${problemId} — falling back to ad-hoc`,
      );
    }
  }

  if (!sourceTemplate && schemaSQL?.trim()) {
    adHocTemplate = `tpl_adhoc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sourceTemplate = adHocTemplate;
    console.log(`[exec:pg] Slow path: building ${adHocTemplate}`);
    await runSafeDDL(`CREATE DATABASE ${adHocTemplate} TEMPLATE template1`);
    await runSafe(schemaSQL, adHocTemplate);
  }

  if (!sourceTemplate) {
    sourceTemplate = "template1";
    console.log(`[exec:pg] Fallback: empty sandbox`);
  }

  const dbName = `sandbox_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  console.log(`[exec:pg] Cloning ${sourceTemplate} → ${dbName}`);

  try {
    await runSafeDDL(`CREATE DATABASE ${dbName} TEMPLATE ${sourceTemplate}`);
    await runSafe(`SET statement_timeout = 8000`, dbName);
    const result = await runSafe(sql, dbName);
    console.log(`[exec:pg] Query success`);
    return parsePostgresResult(result);
  } catch (err) {
    console.error(`[exec:pg] Error:`, err.message);
    throw err;
  } finally {
    _cleanupPostgres(dbName, runPostgresDDL);
    if (adHocTemplate) _cleanupPostgres(adHocTemplate, runPostgresDDL);
  }
}

async function _cleanupPostgres(dbName, runPostgresDDL) {
  try {
    await runPostgresDDL(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${dbName}' AND pid <> pg_backend_pid()
    `).promise;
    await runPostgresDDL(`DROP DATABASE IF EXISTS ${dbName}`).promise;
    console.log(`[exec:pg] Cleanup done: ${dbName}`);
  } catch (err) {
    console.error(`[exec:pg] Cleanup error for ${dbName}:`, err.message);
  }
}

// MYSQL

async function _runMySQL(sql, schemaSQL, problemId) {
  const { runMySQL, runMySQLAdmin, cloneMySQLDatabase, dropMySQLDatabase } =
    await import("#server/executor/mysqlExecutor.js");

  const runSafe = withTimeout(runMySQL, 10000);
  const runSafeAdmin = withTimeout(runMySQLAdmin, 15000); // clone can be slower

  let sourceTemplate = null;
  let adHocTemplate = null;

  if (problemId) {
    sourceTemplate = await resolveTemplate(problemId, "mysql");
    if (sourceTemplate) {
      console.log(`[exec:mysql] Fast path: ${sourceTemplate}`);
    } else {
      console.warn(
        `[exec:mysql] No template for problem ${problemId} — falling back to ad-hoc`,
      );
    }
  }

  if (!sourceTemplate && schemaSQL?.trim()) {
    adHocTemplate = `tpl_adhoc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sourceTemplate = adHocTemplate;
    console.log(`[exec:mysql] Slow path: building ${adHocTemplate}`);
    await runSafeAdmin(`CREATE DATABASE \`${adHocTemplate}\``);
    await runSafeAdmin(`USE \`${adHocTemplate}\`; ${schemaSQL}`);
  }

  const dbName = `sandbox_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  console.log(`[exec:mysql] Cloning ${sourceTemplate ?? "empty"} → ${dbName}`);

  try {
    if (sourceTemplate) {
      // Clone template via mysqldump | mysql (MySQL has no TEMPLATE equivalent)
      await cloneMySQLDatabase(sourceTemplate, dbName);
    } else {
      // No template, no schemaSQL → empty sandbox
      await runSafeAdmin(`CREATE DATABASE \`${dbName}\``);
    }

    console.log(`[exec:mysql] Sandbox ready: ${dbName}`);

    // Run user query with a timeout guard via MAX_EXECUTION_TIME hint
    // This is MySQL's equivalent of SET statement_timeout
    const timedSQL = `SET SESSION MAX_EXECUTION_TIME=8000; ${sql}`;
    const result = await runSafe(timedSQL, dbName);

    console.log(`[exec:mysql] Query success`);
    return parseMySQLResult(result);
  } catch (err) {
    console.error(`[exec:mysql] Error:`, err.message);
    throw err;
  } finally {
    // Fire-and-forget cleanup
    _cleanupMySQL(dbName, dropMySQLDatabase);
    if (adHocTemplate) _cleanupMySQL(adHocTemplate, dropMySQLDatabase);
  }
}

async function _cleanupMySQL(dbName, dropMySQLDatabase) {
  try {
    await dropMySQLDatabase(dbName);
    console.log(`[exec:mysql] Cleanup done: ${dbName}`);
  } catch (err) {
    console.error(`[exec:mysql] Cleanup error for ${dbName}:`, err.message);
  }
}

// SQLITE

async function _runSQLite(sql, schemaSQL, problemId) {
  const {
    runSQLite,
    cloneSQLiteDatabase,
    dropSQLiteDatabase,
    createSQLiteTemplate,
  } = await import("#server/executor/sqliteExecutor.js");

  // SQLite paths inside the container
  const SANDBOX_DIR = "/sandbox";
  const TEMPLATE_DIR = "/templates";

  const runSafe = withTimeout(runSQLite, 10000);

  let sourceTplPath = null;
  let adHocTplPath = null;

  if (problemId) {
    sourceTplPath = await resolveTemplate(problemId, "sqlite");
    if (sourceTplPath) {
      console.log(`[exec:sqlite] Fast path: ${sourceTplPath}`);
    } else {
      console.warn(
        `[exec:sqlite] No template for problem ${problemId} — falling back to ad-hoc`,
      );
    }
  }

  if (!sourceTplPath && schemaSQL?.trim()) {
    // Build one-off template file (admin preview)
    const adHocId = `adhoc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    adHocTplPath = `${TEMPLATE_DIR}/tpl_${adHocId}.db`;
    sourceTplPath = adHocTplPath;
    console.log(`[exec:sqlite] Slow path: building ${adHocTplPath}`);
    await createSQLiteTemplate(`adhoc_${adHocId}`, "universal", schemaSQL);
  }

  // Unique sandbox DB file path
  const sandboxPath = `${SANDBOX_DIR}/sandbox_${Date.now()}_${Math.random().toString(36).slice(2)}.db`;
  console.log(`[exec:sqlite] Sandbox: ${sandboxPath}`);

  try {
    if (sourceTplPath) {
      // Clone template file — O(1) cp inside container
      await cloneSQLiteDatabase(sourceTplPath, sandboxPath);
      console.log(`[exec:sqlite] Cloned ${sourceTplPath} → ${sandboxPath}`);
    }
    // If no template, just run against a fresh (empty) DB file — sqlite3 creates it automatically

    const result = await runSafe(sql, sandboxPath);
    console.log(`[exec:sqlite] Query success`);
    return parseSQLiteResult(result);
  } catch (err) {
    console.error(`[exec:sqlite] Error:`, err.message);
    throw err;
  } finally {
    // Fire-and-forget cleanup
    _cleanupSQLite(sandboxPath, dropSQLiteDatabase);
    if (adHocTplPath) _cleanupSQLite(adHocTplPath, dropSQLiteDatabase);
  }
}

async function _cleanupSQLite(dbPath, dropSQLiteDatabase) {
  try {
    await dropSQLiteDatabase(dbPath);
    console.log(`[exec:sqlite] Cleanup done: ${dbPath}`);
  } catch (err) {
    console.error(`[exec:sqlite] Cleanup error for ${dbPath}:`, err.message);
  }
}

/**
 * Executes a user SQL query in an isolated sandbox.
 *
 * @param {string}             sql        - User's SQL query
 * @param {"postgres"|"mysql"|"sqlite"} engine
 * @param {string}             schemaSQL  - Fallback schema (used only when no pre-built template)
 * @param {string|number|null} problemId  - When provided, clones pre-built template (fast path)
 */
export const runCoreExecution = async (
  sql,
  engine,
  schemaSQL = "",
  problemId = null,
) => {
  const validation = validateQuery(sql);
  if (!validation.valid) throw new Error(validation.error);

  switch (engine) {
    case "postgres":
      return _runPostgres(sql, schemaSQL, problemId);
    case "mysql":
      return _runMySQL(sql, schemaSQL, problemId);
    case "sqlite":
      return _runSQLite(sql, schemaSQL, problemId);
    default:
      throw new Error(`Unsupported engine: ${engine}`);
  }
};

export const fetchProblemResult = async (
  problemId,
  columns = "*",
  client = db,
) => {
  const selectedRows = Array.isArray(columns) ? columns.join(", ") : columns;

  const result = await client.query(
    `SELECT ${selectedRows} FROM problems WHERE id = $1`,
    [problemId],
  );
  return result.rows[0];
};

export const preventDuplicativeSolves = async (userId, problemId) => {
  const result = await db.query(
    `SELECT 1
FROM submissions
WHERE user_id = $1 AND problem_id = $2;`,
    [userId, problemId],
  );
  return result.rowCount > 0;
};

export const saveSubmission = async (userId, problemId, sql, client) => {
  await client.query(
    `INSERT INTO submissions (user_id, problem_id, submitted_sql, is_correct)
       VALUES ($1, $2, $3, TRUE)`,
    [userId, problemId, sql],
  );
};

export async function updateUserProblemState(
  userId,
  problemId,
  isCorrect,
  client,
) {
  // create row or increment attempts
  await client.query(
    `
    INSERT INTO user_problem_state (user_id, problem_id, attempts, first_attempt_at)
    VALUES ($1,$2,1,NOW())
    ON CONFLICT (user_id, problem_id)
    DO UPDATE SET attempts = user_problem_state.attempts + 1
    `,
    [userId, problemId],
  );

  if (isCorrect) {
    await client.query(
      `
      UPDATE user_problem_state
      SET is_solved = true,
          solved_at = NOW()
      WHERE user_id = $1
      AND problem_id = $2
      AND is_solved = false
      `,
      [userId, problemId],
    );
  }
}

// update user progress
export const checkAndMarkLessonAsComplete = async (
  userId,
  lessonId,
  client,
) => {
  // total problems in a lesson
  const totalProblemsRes = await client.query(
    `SELECT COUNT(*) FROM problems WHERE lesson_id = $1`,
    [lessonId],
  );
  const totalProblems = Number(totalProblemsRes.rows[0].count);
  if (totalProblems === 0) return;

  //solved problems by user
  const solvedProblemsRes = await client.query(
    ` SELECT COUNT(DISTINCT s.problem_id)
    FROM submissions s
    JOIN problems p ON p.id = s.problem_id
    WHERE s.user_id = $1
      AND s.is_correct = true
      AND p.lesson_id = $2
    `,
    [userId, lessonId],
  );

  const solvedProblems = Number(solvedProblemsRes.rows[0].count);

  //mark lesson completed if fully solved

  if (solvedProblems === totalProblems) {
    await client.query(
      `
      INSERT INTO user_lesson_progress (
        user_id,
        lesson_id,
        completed,
        completed_at,
        updated_at
      )
      VALUES ($1, $2, true, NOW(), NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        completed = true,
        completed_at = NOW(),
        updated_at = NOW()
      `,
      [userId, lessonId],
    );
  }
};

export const checkAndMarkTrackAsComplete = async (userId, trackId, client) => {
  // Total problems in track
  const totalProblemsRes = await client.query(
    `
    SELECT COUNT(*) AS total
    FROM problems p
    JOIN lessons l ON l.id = p.lesson_id
    WHERE l.track_id = $1
    `,
    [trackId],
  );
  const totalProblems = Number(totalProblemsRes.rows[0].total);
  if (totalProblems === 0) return;

  //  Correctly solved problems by user in this track
  const solvedProblemsRes = await client.query(
    `
    SELECT COUNT(DISTINCT s.problem_id) AS solved
    FROM submissions s
    JOIN problems p ON p.id = s.problem_id
    JOIN lessons l ON l.id = p.lesson_id
    WHERE s.user_id = $1
      AND s.is_correct = true
      AND l.track_id = $2
    `,
    [userId, trackId],
  );
  const solvedProblems = Number(solvedProblemsRes.rows[0].solved);

  // Insert or update user_track_progress
  const completed = solvedProblems === totalProblems;
  await client.query(
    `
    INSERT INTO user_track_progress (
      user_id,
      track_id,
      completed_problems,
      total_problems,
      completed,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (user_id, track_id)
    DO UPDATE SET
      completed_problems = $3,
      total_problems = $4,
      completed = $5,
      updated_at = NOW()
    `,
    [userId, trackId, solvedProblems, totalProblems, completed],
  );
};

export const getCurrentXpAndLevel = async (userId, client) => {
  const userXpAndLevel = await client.query(
    `SELECT xp, level FROM users WHERE id = $1`,
    [userId],
  );
  const xp = userXpAndLevel.rows[0].xp;
  const Level = userXpAndLevel.rows[0].level;
  return { xp, Level };
};

export const xpAndLevelUpating = async (userId, xpchange, client) => {
  const xpResult = await client.query(
    ` UPDATE users
    SET xp = GREATEST(xp + $1, 0)
    WHERE id = $2
    RETURNING xp`,
    [xpchange, userId],
  );
  const newXp = xpResult.rows[0].xp;
  const newLevel = calculateLevel(newXp);

  await client.query(
    `UPDATE users
    SET level = $1
    WHERE id = $2`,
    [newLevel, userId],
  );
  return { newXp, newLevel };
};

export const is_problemSolved = async (userId, problemId, client = db) => {
  const result = await client.query(
    `
    SELECT COALESCE(is_solved, false) AS solved
    FROM user_problem_state
    WHERE user_id = $1 AND problem_id = $2
    `,
    [userId, problemId],
  );

  return result.rows[0]?.solved ?? false;
};

export const is_solutionViewed = async (userId, problemId, client = db) => {
  const result = await client.query(
    `SELECT 1
       FROM solution_views
       WHERE user_id = $1
       AND problem_id = $2`,
    [userId, problemId],
  );
  return result.rowCount > 0;
};

export const getCurrentLevel = async (userId, client = db) => {
  const result = await client.query(`SELECT level FROM users WHERE id = $1`, [
    userId,
  ]);
  return result.rows[0].level;
};

export const recordSolutionView = async (userId, problemId, client = db) => {
  await client.query(
    `
    INSERT INTO solution_views (user_id, problem_id, viewed_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, problem_id) 
    DO UPDATE SET viewed_at = EXCLUDED.viewed_at;
    `,
    [userId, problemId],
  );
};

export const updateUserStreak = async (userId, client) => {
  const result = await client.query(
    `SELECT current_streak, longest_streak, last_solved_date
     FROM users
     WHERE id = $1`,
    [userId],
  );
  const user = result.rows[0];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toDateString().slice(0, 10);

  let newStreak = user.current_streak;

  if (user.last_solved_date === todayStr) return;
  if (user.last_solved_date === yesterday) {
    newStreak += 1;
  } else {
    newStreak = 1;
  }

  const longest = Math.max(newStreak, user.longest_streak);

  await client.query(
    `UPDATE users
     SET current_streak = $1,
         longest_streak = $2,
         last_solved_date = $3
     WHERE id = $4`,
    [newStreak, longest, todayStr, userId],
  );
};

export const getLeaderboard = async () => {
  const result = await db.query(`SELECT id, username, xp
    FROM users
    ORDER BY xp DESC
    LIMIT 50`);
  return result.rows;
};
