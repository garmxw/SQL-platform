import { db } from "#shared/config/db.js";
import {
  fetchProblemResult,
  getCurrentLevel,
  is_problemSolved,
  recordSolutionView,
} from "#shared/services/sqlDataQueries.js";

const getPenalty = (difficulty) => {
  switch (difficulty) {
    case "easy":
      return -150;
    case "medium":
      return -300;
    case "hard":
      return -500;
    default:
      return -200;
  }
};

export async function viewSolutionController(req, res) {
  const { problemId } = req.params;
  const userId = req.user.id;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // fetch the problem
    const problemResult = await fetchProblemResult(
      problemId,
      ["id", "solution", "difficulty"],
      client,
    );

    if (!problemResult) throw new Error("Problem not found");
    //check if problem is solved
    const alreadySolved = is_problemSolved(userId, problemId, client);

    //check if solution already viewed
    const alreadyViewed = is_problemSolved(userId, problemId, client);

    let penaltyApplied = false;
    let xpLost = 0;
    let previousLevel = null;
    let newestLevel = null;
    let leveledDown = false;

    //The Penalty Logic (../utils/penaltyLogic.js)
    if (!alreadySolved && !alreadyViewed) {
      const penalty = getPenalty(problemResult.difficulty);
      //store te prev level
      const prevLevel = await getCurrentLevel(userId);

      //apply the xp penalty
      const { newXP, newLevel } = await xpAndLevelUpating(
        userId,
        penalty,
        client,
      );

      xpLost = Math.abs(penalty);
      penaltyApplied = true;
      newestLevel = newLevel;
      if (newestLevel < prevLevel) leveledDown = true;

      //record solution view
      await recordSolutionView(userId, problemId, client);
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      penaltyApplied,
      xpLost,
      previousLevel,
      newestLevel,
      leveledDown,
      solution: problemResult.solution,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("View Solution Error: ", err);
  } finally {
    client.release();
  }
}
