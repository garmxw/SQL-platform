import { Router } from "express";
import { executeSQL } from "../controllers/executionLogic.js";

const router = Router();

router.post("/execute", executeSQL);
router.post("/execute/explain");

export default router;
