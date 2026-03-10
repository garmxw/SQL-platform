import { db } from "../config/db.js";
import { parseMySQLResult } from "../utils/parseMysqlRaw.js";
import { parsePostgresResult } from "../utils/parsePostgresRaw.js";
import { parseSQLiteResult } from "../utils/parsesqlite.js";
import { validateQuery } from "../security/validateQuery.js";
import { withTimeout } from "../executor/timeOut.js";
import { calculateLevel } from "../utils/levelUtils.js";

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
