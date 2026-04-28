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
import lessonsRouter from "./routes/lessonsRouter.js";
import problemsRouter from "./routes/problemsRouter.js";
import adminRouter from "./routes/adminRouter.js";
import profileRouter from "./routes/profileRouter.js";
import adminContentRouter from "./routes/adminContentRouter.js";
import tracksRouter from "./routes/tracksRouter.js";
import editorRoutes from "./routes/editorRoutes.js";
import examRouter from "./routes/examSubmissionRouter.js";
import submitRouter from "./routes/submitRouter.js";
import userDashboardRouter from "./routes/userProfile.js";
import leaderboardRouter from "./routes/leaderboardRouter.js";
import adminDashboardRouter from "./routes/adminDashboardRoute.js";

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
  const host = req.get("host") || "";
  if (host.startsWith("admin.")) {
    return next();
  }
  res.status(403).send("Forbidden: Admins only.");
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
  //server.use("/api", submissionsRouter);

  server.use("/api/tracks", tracksRouter);
  server.use("/api/lessons", lessonsRouter);
  server.use("/api/problems", problemsRouter);
  server.use("/api/editor", editorRoutes);
  server.use("/api/exam", examRouter);
  server.use("/api/submit", submitRouter);
  server.use("/api/profile/dashboard", userDashboardRouter);
  server.use("/api/leaderboard", leaderboardRouter);

  server.use("/api/admin", adminSubdomainCheck, adminRouter);
  server.use("/api/admin", adminSubdomainCheck, adminDashboardRouter);
  server.use("/api/content", adminSubdomainCheck, adminContentRouter);
  server.use("/api/profile", profileRouter);
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
