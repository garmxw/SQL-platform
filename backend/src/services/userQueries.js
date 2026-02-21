import { db } from "../config/db.js";

export const findUserBy_email_Or_username = async (email, username) => {
  let query = `SELECT * FROM users WHERE`;
  const values = [];

  if (email && username) {
    query += ` email = $1 OR username = $2`;
    values.push(email, username);
  } else if (email) {
    query += ` email = $1`;
    values.push(email);
  } else if (username) {
    query += ` username = $1`;
    values.push(username);
  } else {
    return false; // No email or username provided and this is impossible to reach cuz we validate earlier useing validators
  }
  const result = await db.query(query, values);

  return result.rows[0];
};

export const create_user = async (username, email, hashedPassword) => {
  const query = `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, user_role, created_at`;
  const result = await db.query(query, [username, email, hashedPassword]);
  return result;
};

export const saveVerificationCodeHash = async (userId, hash, expiryDate) => {
  const query = `UPDATE users SET verification_hash = $1, verification_expires_at = $2 WHERE id = $3`;
  await db.query(query, [hash, expiryDate, userId]);
};

export const markUserAsVerified = async (userId) => {
  const query = `UPDATE users SET is_verified = true, verification_hash = null, verification_expires_at = null WHERE id = $1`;
  await db.query(query, [userId]);
};

export const updateLoginHistory = async (id) => {
  const query = `UPDATE users SET last_login = CURRENT_TIMESTAMP 
  WHERE id = $1;`;
  await db.query(query, [id]);
};

// btw im using the col of verification_hash and verification_expires_at as a saving place for the reset token cuz they will be not used

export const find_user_by_token = async (token) => {
  const query = `SELECT * FROM users WHERE verification_hash = $1 AND verification_expires_at > NOW()`;
  const result = await db.query(query, [token]);

  if (result.rows.length === 0) {
    // This triggers if the token is wrong OR if it is expired
    return null;
  }

  return result.rows[0];
};

export const find_user_by_id = async (userId) => {
  const query = `SELECT * FROM users WHERE id = $1 RETURNING id, username, email, user_role, created_at, last_login`;
  const result = await db.query(query, [userId]);

  if (result.rows.length === 0) return null;

  return result.rows[0];
};

export const updatePassword = async (id, hash) => {
  const query = `UPDATE users SET password_hash = $1, verification_hash = null, verification_expires_at = null WHERE id = $2`;
  await db.query(query, [hash, id]);
};
