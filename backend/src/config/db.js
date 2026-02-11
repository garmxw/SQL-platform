import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
});

db.on("connect", () => {
  console.log("Connected to PostgresSql");
});

db.on("error", (err) => {
  console.error("Error connecting to PostgresSql", err);
  process.exit(-1);
});
