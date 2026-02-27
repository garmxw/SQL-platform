import { normalizeResult } from "../utils/normalizeResult.js";
import { compareResults } from "../utils/compareResults.js";
import { runCoreExecution } from "../services/sqlService.js";
import {
  fetchProblemResult,
  saveSubmission,
  preventSuplicativeSolves,
  checkAndMarkLessonAsComplete,
  checkAndMarkTrackAsComplete,
} from "../services/sqlDataQueries.js";
import { db } from "../config/db.js";

export const submitSolution = async (req, res) => {
  try {
    const { trackId, problemId, sql, engine } = req.body;
    const userId = req.user.id; //from auth cookie

    if (!problemId || !sql || !engine) {
      return res.status(400).json({
        success: false,
        message: "Problem, SQL and engine required",
      });
    }

    //fetch problem and solution
    const problem = fetchProblemResult(problemId);
    if (!problem)
      return res
        .status(400)
        .json({ success: false, message: "Problem not found" });

    const solutionSql = problem.solution_sql[engine];
    // explanation of the solutionSql:
    /*
        because solution_sql is a json and it will be in this format for example 
        {
  "mysql": "SELECT name FROM employees WHERE role = 'Engineer'",
  "postgres": "SELECT name FROM employees WHERE role = 'Engineer'",
  "sqlite": "SELECT name FROM employees WHERE role = 'Engineer'"
        }
        so we select the engine that we want to run the sql in .
        PS: this is the solution we're going to make for the problem 
        */

    if (!solutionSql) {
      return res.status(400).json({
        success: false,
        message: "no solution found for the problem",
      });
    }

    // run user sql
    let UserParsed;
    try {
      // We call the service directly no faking req, res, or status!
      UserParsed = await runCoreExecution(sql, engine);

      // Now userSqlParsed contains the real data you need for comparison
    } catch (err) {
      // If the SQL is invalid or the executor fails, it hits this block
      throw new Error(`Solution execution failed: ${err.message}`);
    }

    // run solution sql
    let solutionParsed;
    try {
      solutionParsed = await runCoreExecution(solutionSql, engine);
    } catch (err) {
      throw new Error(`Solution execution failed: ${err.message}`);
    }

    //normalize result
    const ignoreOrder = !(problem.order_matters ?? false);
    const normalizeUserSql = normalizeResult(
      UserParsed.parsedResult,
      ignoreOrder,
    );
    const normalizeSolutionSql = normalizeResult(
      solutionParsed.parsedResult,
      ignoreOrder,
    );

    // check for duplicate solves
    const isSolved = await preventSuplicativeSolves(userId, problemId);
    if (isSolved) {
      return res.status(200).json({
        success: false,
        message: "Problem already solved",
      });
    }

    // compare with feedback
    const comparison = compareResults(normalizeUserSql, normalizeSolutionSql, {
      ignoreOrder,
    });

    if (!comparison.isCorrect) {
      return res.status(200).json({
        success: true,
        isCorrect: false,
        feedback: comparison,
        userResult: normalizeUserSql,
      });
    }

    await db.query("BEGIN");
    try {
      //save submission
      await saveSubmission(userId, problemId, sql);
      // check and mark lesson/track as complete when finished
      await checkAndMarkLessonAsComplete(userId, problem.lesson_id);
      await checkAndMarkTrackAsComplete(userId, trackId);

      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }

    return res.status(200).json({
      success: true,
      isCorrect: true,
      message: "Congratulations, Correct solution",
    });
  } catch (error) {
    console.error("submitSQL error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
