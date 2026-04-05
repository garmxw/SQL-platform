import { db } from "../config/db.js";

export const fetchUserProfileData = async (userId) => {
  const query = `SELECT * FROM users WHERE id = $1`;
  const result = await db.query(query, [userId]);
  return result.rows[0];
};

export const fetchAvatarUrlByUserId = async (userId, display_name = false) => {
  const query = `SELECT avatar_url, display_name FROM users WHERE id = $1`;
  const result = await db.query(query, [userId]);
  if (display_name) {
    return result.rows[0]
      ? {
          avatar_url: result.rows[0].avatar_url,
          display_name: result.rows[0].display_name,
        }
      : null;
  }
  return result.rows[0] ? result.rows[0].avatar_url : null;
};

export const UpdateUserProfileData = async (userId, updateFields) => {
  // 1. Get the keys (e.g., ['username', 'bio', 'profile_readme'])
  const keys = Object.keys(updateFields);

  if (keys.length === 0) return null; // Nothing to update

  // 2. Build the SET string dynamically: "username = $1, bio = $2..."
  const setClause = keys
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", ");

  // 3. Prepare the values array
  const values = Object.values(updateFields);

  // 4. Add userId as the final parameter
  values.push(userId);
  const userIdPosition = values.length;

  const query = `
    UPDATE users 
    SET ${setClause} 
    WHERE id = $${userIdPosition}
    RETURNING id, username, display_name, bio, location, avatar_url, 
              github_name, twitter_name, portfolio_url, banner_url, profile_readme;
  `;

  const result = await db.query(query, values);
  return result.rows[0];
};
