import express from "express";
import executionRouter from "./routes/execution.js";
import dotenv from "dotenv";
import { db } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api", executionRouter);

const testDbConnection = async () => {
  try {
    const result = await db.query("SELECT NOW()");
    console.log("Database Current Time: ", result.rows[0].now);
  } catch (err) {
    console.error("Error testing database connection:", err);
  }
};

testDbConnection();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
