import { Router } from "express";

const router = Router({ mergeParams: true });

router.get("/"); // (/:trackId/progress or smt else)
router.get("/overview");
router.get("/tracks");
router.get("/lessons");
router.get("/problems");

//future analytics and future admin use
router.get("/analytics/users");
router.get("/analytics/problems");
router.get("/analytics/tracks");

export default router;
