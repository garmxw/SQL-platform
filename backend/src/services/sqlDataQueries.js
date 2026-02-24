import { db } from "../config/db.js";
import { parseMySQLResult } from "../utils/parseMysqlRaw.js";
import { parsePostgresResult } from "../utils/parsePostgresRaw.js";
import { parseSQLiteResult } from "../utils/parsesqlite.js";
import { validateQuery } from "../security/validateQuery.js";
import { withTimeout } from "../executor/timeOut.js";

export const runCoreExecution = async (sql, engine) => {
  const validation = validateQuery(sql);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  let result, parsedResult;

  switch (engine) {
    case "mysql": {
      const { runMySQL } = await import("../executor/mysqlExecutor.js");
      result = await withTimeout(runMySQL, 10000)(sql);
      parsedResult = parseMySQLResult(result);
      break;
    }
    case "postgres": {
      const { runPostgres } = await import("../executor/postgresExecutor.js");
      result = await withTimeout(runPostgres, 10000)(sql);
      parsedResult = parsePostgresResult(result);
      break;
    }
    case "sqlite": {
      const { runSQLite } = await import("../executor/sqliteExecutor.js");
      result = await withTimeout(runSQLite, 10000)(sql);
      parsedResult = parseSQLiteResult(result);
      break;
    }
    default:
      throw new Error("Unsupported database engine");
  }

  return parsedResult;
};

export const fetchProblemResult = async (problemId) => {
  const result = await db.query("SELECT * FROM problems WHERE id = $1", [
    problemId,
  ]);
  return result.rows[0];
};

export const saveSubmission = async (userId, problemId, sql) => {
  await db.query(
    `INSERT INTO submissions (user_id, problem_id, submitted_sql, is_correct)
       VALUES ($1, $2, $3, TRUE)`,
    [userId, problemId, sql],
  );
};

// total problems in this track
export const totalProblemsResult = async (trackId) => {
  const result = await db.query(
    `SELECT COUNT(*) FROM problems WHERE track_id = $1`,
    [trackId],
  );
  const totalProblems = Number(result.rows[0].count);
  return totalProblems;
};
// completed problems by user in this track
export const completedProblemsResult = async (userId, trackId) => {
  const result = await db.query(
    `
  SELECT COUNT(DISTINCT s.problem_id)
  FROM submissions s
  JOIN problems p ON p.id = s.problem_id
  WHERE s.user_id = $1 AND p.track_id = $2
  `,
    [userId, trackId],
  );
  const completedProblems = Number(result.rows[0].count);
  return completedProblems;
};

// update user progress

export const upateUserProgress = async (
  userId,
  trackId,
  completedProblems,
  totalProblems,
  completed,
) => {
  await db.query(
    `
  INSERT INTO user_progress (
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
    completed_problems = EXCLUDED.completed_problems,
    total_problems = EXCLUDED.total_problems,
    completed = EXCLUDED.completed,
    updated_at = NOW()
  `,
    [userId, trackId, completedProblems, totalProblems, completed],
  );
};
