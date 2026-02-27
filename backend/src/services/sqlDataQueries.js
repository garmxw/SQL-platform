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

export const preventSuplicativeSolves = async (userId, problemId) => {
  const result = await db.query(
    `SELECT 1
FROM submissions
WHERE user_id = $1 AND problem_id = $2;`,
    [userId, problemId],
  );
  return result.rowCount > 0;
};

export const saveSubmission = async (userId, problemId, sql) => {
  await db.query(
    `INSERT INTO submissions (user_id, problem_id, submitted_sql, is_correct)
       VALUES ($1, $2, $3, TRUE)`,
    [userId, problemId, sql],
  );
};

// update user progress
export const checkAndMarkLessonAsComplete = async (userId, lessonId) => {
  // total problems in a lesson
  const totalProblemsRes = await db.query(
    `SELECT COUNT(*) FROM problems WHERE lesson_id = $1`,
    [lessonId],
  );
  const totalProblems = Number(totalProblemsRes.rows[0].count);
  if (totalProblems === 0) return;

  //solved problems by user
  const solvedProblemsRes = await db.query(
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
    await db.query(
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

export const checkAndMarkTrackAsComplete = async (userId, trackId) => {
  // Total problems in track
  const totalProblemsRes = await db.query(
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
  const solvedProblemsRes = await db.query(
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
  await db.query(
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
