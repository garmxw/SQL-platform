import { Router } from "express";

const router = Router({ mergeParams: true });

router.get("/", getAllUserBadges);
router.get("/list-platform-badges", getAllPlatformBadges);
router.get("/:badgeId");

export default router;
