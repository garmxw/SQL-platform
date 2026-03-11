import { Router } from "express";
import { submitSolution } from "../controllers/submmisionController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/submit", authenticateToken, submitSolution);

export default router;
