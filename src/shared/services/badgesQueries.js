import { xpAndLevelUpating } from "./sqlDataQueries.js";

export async function checkAndAwardBadges(userId, client) {
  try {
    // Gather required stats in ONE query batch

    const statsQuery = `
      WITH user_submissions AS (
        SELECT s.*, p.difficulty, p.lesson_id
        FROM submissions s
        LEFT JOIN problems p ON s.problem_id = p.id
        WHERE s.user_id = $1
      ),
      total_correct AS (
        SELECT COUNT(*)::int AS cnt
        FROM user_submissions
        WHERE is_correct = true
      ),
      fast_solves AS (
        SELECT COUNT(*)::int AS cnt
        FROM user_submissions
        WHERE is_correct = true AND execution_time_ms <= 60000
      ),
      total_submissions AS (
        SELECT COUNT(*)::int AS cnt FROM user_submissions
      ),
      streak AS (
        SELECT *
        FROM user_submissions
        ORDER BY created_at DESC
      ),
      first_try AS (
        SELECT problem_id
        FROM user_submissions
        GROUP BY problem_id
        HAVING COUNT(*) = 1 AND BOOL_AND(is_correct = true)
      ),
      hard_solved AS (
        SELECT 1 FROM user_submissions WHERE is_correct = true AND difficulty = 'hard' LIMIT 1
      ),
      easy_missing AS (
        SELECT 1
        FROM problems p
        WHERE p.difficulty = 'easy'
        AND NOT EXISTS (
          SELECT 1 FROM submissions s
          WHERE s.problem_id = p.id AND s.user_id = $1 AND s.is_correct = true
        )
        LIMIT 1
      ),
      track_missing AS (
        SELECT t.id
        FROM tracks t
        WHERE EXISTS (
          SELECT 1
          FROM lessons l
          JOIN problems p ON l.id = p.lesson_id
          WHERE l.track_id = t.id
          AND NOT EXISTS (
            SELECT 1 FROM submissions s
            WHERE s.problem_id = p.id AND s.user_id = $1 AND s.is_correct = true
          )
        )
        LIMIT 1
      )
      SELECT
        (SELECT cnt FROM total_submissions) AS total_submissions,
        (SELECT cnt FROM total_correct) AS total_correct,
        (SELECT cnt FROM fast_solves) AS fast_solves,
        (SELECT COUNT(DISTINCT DATE(created_at)) FROM user_submissions) AS active_days,
        (SELECT COUNT(*) FROM first_try) AS zero_retry_count,
        (SELECT COUNT(*) FROM hard_solved) AS hard_solver,
        (SELECT COUNT(*) FROM easy_missing) AS all_easy_done_missing,
        (SELECT COUNT(*) FROM track_missing) AS all_track_complete_missing,
        ARRAY(
          SELECT LOWER(submitted_sql) FROM streak
          ORDER BY created_at DESC
        ) AS submissions_sql_desc
    `;

    const statsRes = await client.query(statsQuery, [userId]);
    const s = statsRes.rows[0];

    // Process streak

    let streakCount = 0;
    for (const sqlText of s.submissions_sql_desc) {
      if (sqlText) streakCount++;
      else break;
    }

    // Determine which badges to award
    const badgesToAward = [];

    // Beginner
    if (s.total_submissions === 1) badgesToAward.push("FIRST_QUERY");
    if (s.total_correct === 1) badgesToAward.push("FIRST_CORRECT");
    if (s.total_correct === 5) badgesToAward.push("FIVE_SOLVES");
    if (s.total_correct === 10) badgesToAward.push("TEN_SOLVES");

    // Progression
    if (s.total_correct === 25) badgesToAward.push("TWENTY_FIVE_SOLVES");
    if (s.total_correct === 50) badgesToAward.push("FIFTY_SOLVES");
    if (s.total_correct === 100) badgesToAward.push("HUNDRED_SOLVES");

    // Skill-based (look at last submission)
    const lastSql = s.submissions_sql_desc[0] || "";
    if (lastSql.includes(" join ")) badgesToAward.push("FIRST_JOIN");
    if (lastSql.includes("(select")) badgesToAward.push("FIRST_SUBQUERY");
    if (lastSql.includes("group by") && lastSql.includes("having"))
      badgesToAward.push("AGGREGATION_MASTER");
    if (lastSql.includes("over(")) badgesToAward.push("WINDOW_MASTER");

    // Performance
    if (s.fast_solves > 0) badgesToAward.push("SPEED_RUNNER");
    if (streakCount >= 10) badgesToAward.push("TEN_STREAK");

    // Consistency
    if (s.active_days >= 3) badgesToAward.push("THREE_DAY_STREAK");
    if (s.active_days >= 7) badgesToAward.push("SEVEN_DAY_STREAK");
    if (s.active_days >= 30) badgesToAward.push("THIRTY_DAY_STREAK");

    // Zero Retry
    if (s.zero_retry_count > 0) badgesToAward.push("ZERO_RETRY");

    // Advanced
    if (s.hard_solver > 0) badgesToAward.push("HARD_SOLVER");
    if (s.all_easy_done_missing === 0) badgesToAward.push("ALL_EASY_DONE");
    if (s.all_track_complete_missing === 0)
      badgesToAward.push("ALL_TRACK_COMPLETE");

    // Award badges + XP

    let totalXp = 0;
    let newlyEarnedBadges = [];

    if (badgesToAward.length > 0) {
      const badgeData = await client.query(
        `SELECT id, code, xp_reward FROM badges WHERE code = ANY($1)`,
        [badgesToAward],
      );

      for (const badge of badgeData.rows) {
        const insert = await client.query(
          `
      INSERT INTO user_badges (user_id, badge_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
          [userId, badge.id],
        );

        if (insert.rowCount > 0) {
          totalXp += badge.xp_reward || 0;
          newlyEarnedBadges.push({
            code: badge.code,
            xpReward: badge.xp_reward,
          });
        }
      }
    }

    return {
      newlyEarnedBadges: [],
      badgeXpGained: totalXp,
    };
  } catch (err) {
    console.error("Badge evaluation failed:", err);
  }
}
