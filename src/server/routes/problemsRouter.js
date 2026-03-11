import { Router } from "express";
import { viewSolutionController } from "../controllers/viewSolutionController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getAllproblems);
router.get("/:problemId");
router.get("/:problemId/status");
router.post("/:problemId/submit");
router.post("/:problemId/run");
router.post("/:problemId/solution");
router.post("/:problemId/solution", authenticateToken, viewSolutionController);

//admin
router.post("/");
router.patch("/:problemId");
router.delete("/:problemId");

export default router;
