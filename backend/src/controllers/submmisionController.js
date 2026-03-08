import { normalizeResult } from "../utils/normalizeResult.js";
import { compareResults } from "../utils/compareResults.js";
import { runCoreExecution } from "../services/sqlService.js";
import {
  fetchProblemResult,
  saveSubmission,
  preventDuplicativeSolves,
  checkAndMarkLessonAsComplete,
  checkAndMarkTrackAsComplete,
  xpAndLevelUpating,
  updateUserProblemState,
  getCurrentXpAndLevel,
} from "../services/sqlDataQueries.js";
import { checkAndAwardBadges } from "../services/badgesQueries.js";
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
    const problem = await fetchProblemResult(problemId);
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

    // check for duplicate solves
    const isSolved = await preventDuplicativeSolves(userId, problemId);
    if (isSolved) {
      return res.status(200).json({
        success: false,
        message: "Problem already solved, You can't Re-submmit it",
      });
    }

    // run user sql
    let UserParsed;
    try {
      UserParsed = await runCoreExecution(sql, engine);
    } catch (err) {
      throw new Error(`User SQL execution failed: ${err.message}`);
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

    let badgeXp = 0;
    let totalXpChange = 0;
    let newXp, newLevel, leveledUP, userBefore, badgeXpAndLevelRes;

    const client = await db.connect(); // this for transactions so if any of the logic below fails it will rollback or commit it if it success

    try {
      await client.query("BEGIN");

      //save submission
      await saveSubmission(userId, problemId, sql, client);

      // save the state table
      await updateUserProblemState(
        userId,
        problemId,
        comparison.isCorrect,
        client,
      );

      // check and mark lesson/track as complete when finished
      await checkAndMarkLessonAsComplete(userId, problem.lesson_id, client);
      await checkAndMarkTrackAsComplete(userId, trackId, client);

      // get user xp and level before changing them
      userBefore = await getCurrentXpAndLevel(userId, client);

      //check and award badges
      badgeXpAndLevelRes = await checkAndAwardBadges(userId, client);

      // compute changes
      badgeXp = badgeXpAndLevelRes.badgeXpGained || 0;
      totalXpChange = problem.xp_reward + badgeXp;

      //award xp & updating Level
      ({ newXp, newLevel } = await xpAndLevelUpating(
        userId,
        totalXpChange,
        client,
      ));
      leveledUP = newLevel > userBefore.Level;

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return res.status(200).json({
      success: true,
      isCorrect: true,
      xpFromProblem: problem.xp_reward,
      xpFromBadges: badgeXp,
      XpGained: totalXpChange,
      previousLevel: userBefore.Level,
      newLevel: newLevel,
      is_leveledUp: leveledUP,
      earnedBadges: badgeXpAndLevelRes.newlyEarnedBadges,
      message: "Congratulations, Correct solution",
    });
  } catch (error) {
    console.error("submitSQL error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
