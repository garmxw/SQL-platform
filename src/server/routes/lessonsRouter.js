import { Router } from "express";
import problemRouter from "./problemsRouter.js";

const router = Router({ mergeParams: true });

// Matches /api/tracks/:trackId/lessons
router.get("/", getAllLessons);

// Matches /api/tracks/:trackId/lessons/:lessonId
router.get("/:lessonId", getLessonById);
// Matches /api/tracks/:trackId/lessons/:lessonId/complete
router.post("/:lessonId/complete", markAsComplete);
// Matches /api/tracks/:trackId/lessons/:lessonId/problems
router.use("/:lessonId/problems", problemRouter);

router.use("/:lessonId/progress", progressRouter);
router.post("/:lessonId/run-demo-sql");

//for admin only
router.post("/");
router.patch("/:lessonId");
router.delete("/:lessonId");

export default router;
