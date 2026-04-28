import { Router } from "express";
import { submitExam } from "#server/controllers/examController.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";

const router = new Router();

router.use(authenticateToken);

router.post("/submit", submitExam);

export default router;
