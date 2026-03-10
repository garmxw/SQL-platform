import { Router } from "express";
import lessonsRoute from "./lessonsRouter";

const router = Router();

// 1. Get all tracks: /api/tracks
router.get("/", getAllTracks);

// 2. Nest lessons under a specific track: /api/tracks/:trackId/lessons
router.use("/:trackId/lessons", lessonsRoute);

// (/api/tracks/:trackId/problems)
router.use("/:trackId/problems", problemRoute);

// 3. Get track details: /api/tracks/:trackId
router.get("/:trackId", getTrackById);

// (/progress) for completion% ,locked/unlocked, progress bars
router.use("/:trackId/progress", progressRoute);

// admin only
router.post("/");
router.patch("/:trackId");
router.delete("/:trackId");

export default router;
