import express from "express";
import next from "next";
import { db } from "#shared/config/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";

// Route imports
import authRouter from "./routes/authRouter.js";
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
import leaderboardRouter from "./routes/leaderboard.js";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const PORT = process.env.PORT || 3000;
// middleware to check for admin routes
const adminSubdomainCheck = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const host = req.get("hsot") || "";
  if (host.startsWith("admin.")) {
    return next();
  }
  res.status(403).send("Forbiddem: Admins only.");
};

// Test DB Connection
const testDbConnection = async () => {
  try {
    const result = await db.query("SELECT NOW()");
    console.log("Database Current Time: ", result.rows[0].now);
  } catch (err) {
    console.error("Error testing database connection:", err);
  }
};

nextApp.prepare().then(() => {
  const server = express();
  // configuring CORS
  server.use(
    cors({
      // Add all the local origins you use
      origin: [
        `${process.env.LOCAL_DOMAIN}:${PORT}`,
        `${process.env.ADMIN_LOCAL_DOMAIN}:${PORT}`,
        `${process.env.DOMAIN}:${PORT}`,
        `${process.env.ADMIN_DOMAIN}:${PORT}`,
      ],
      credentials: true, // Allows the browser to send the JWT cookie to Express
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // 1. Middlewares
  server.use(express.json());
  server.use(cookieParser());

  // 2. Express API Routes
  server.use("/auth", authRouter);
  server.use("/api", executionRouter);
  server.use("/api", submissionsRouter);
  server.use("/api/tracks", trackRouter);
  server.use("/api/lessons", lessonsRouter);
  server.use("/api/problems", problemsRouter);
  server.use("/api/users", usersRouter);
  server.use("/api/progress", progressRouter);
  server.use("/api/badges", badgesRouter);
  server.use("/api/xp", xpRouter);
  server.use("/api/history", historyRouter);
  server.use("/api/system", systemRouter);
  server.use("/leaderboard", leaderboardRouter);
  server.use("/api/admin", adminSubdomainCheck, adminPanelRouter);
  server.get("/", (req, res) => {
    return handle(req, res);
  });

  // Next.js Handler (MUST be last)
  // This tells Express: "If none of the above routes match, let Next.js handle it."
  server.all("/*splat", (req, res) => {
    return handle(req, res);
  });
  testDbConnection();
  server.listen(PORT, () => {
    console.log(`> Unified Server ready on :${PORT}`);
  });
});
