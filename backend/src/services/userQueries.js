import { db } from "../config/db.js";

export const is_user_exists = async (email, username) => {
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

  return result.rows.length > 0;
};

export const create_user = async (username, email, hashedPassword) => {
  const query = `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, user_role`;
  const values = [username, email, hashedPassword];
  const result = await db.query(query, values);
  return result;
};

export const getUserByEmail = async (email) => {
  const query = `SELECT * FROM users WHERE email = $1`;
  const values = [email];
  const result = await db.query(query, values);
  return result;
};
