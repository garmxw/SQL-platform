import { Router } from "express";
import { executeSQL } from "../controllers/executionLogic.js";

const router = Router();

router.post("/execute", executeSQL);

export default router;
