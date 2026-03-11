import { Router } from "express";

const router = Router();

//FOR:
// feature flags
// disabling solution view
// maintenance mode

router.get("/health");
router.get("/version");
router.get("/config");

export default router;
