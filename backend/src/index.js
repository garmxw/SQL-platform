import express from "express";
import { db } from "./config/db.js";
import authRouter from "./routes/authRouter.js";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
//local imports
import executionRouter from "./routes/executionRouter.js";
import submissionsRouter from "./routes/submissionsRouter.js";
import trackRouter from "./routes/trackRouter.js";
import lessonsRouter from "./routes/lessonsRouter.js";
import problemsRouter from "./routes/problemsRouter.js";
import usersRouter from "./routes/usersRouter.js";
import badgesRouter from "./routes/badgesRouter.js";
import progressRouter from "./routes/progressRouter.js";
import xpRouter from "./routes/xpRouter.js";
import adminPanelRouter from "./routes/adminPanelRouter.js";
import systemRouter from "./routes/systemeRouter.js";
import historyRouter from "./routes/history.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser()); // parse incoming cookies
app.use("/auth", authRouter);
app.use("/api", executionRouter);
app.use("/api", submissionsRouter);
app.use("/api/tracks", trackRouter);
app.use("/api/lessons", lessonsRouter);
app.use("/api/problems", problemsRouter);
app.use("/api/users", usersRouter);
app.use("/api/progress", progressRouter);
app.use("/api/badges", badgesRouter);
app.use("/api/xp", xpRouter);
app.use("/api/history", historyRouter);
app.use("/api/system", systemRouter);
app.use("/admin", adminPanelRouter);

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
