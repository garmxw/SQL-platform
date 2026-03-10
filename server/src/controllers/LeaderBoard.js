import { getLeaderboard } from "../services/sqlDataQueries";

export async function LeaderBoardController(req, res) {
  try {
    const result = await getLeaderboard();

    if (!result) {
      return res.status(200).json({
        success: false,
        error: "Empty leaderBoard",
      });
    }

    res.status(200).json({
      success: true,
      leaderboard: result,
    });
  } catch (err) {
    console.error("LeaderBoard error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
