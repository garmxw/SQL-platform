import { Router } from "express";

import {
  cloudinarySignatureController,
  getProfileDataController,
  getUserAvatarController,
  updateProfileDataController,
} from "../controllers/userprofileController.js";
import { authenticateToken } from "#server/middleware/authMiddleware.js";
const router = Router();

router.get(
  "/cloudinary-signature",
  authenticateToken,
  cloudinarySignatureController,
);
router.get("/get-UserAvatar", authenticateToken, getUserAvatarController);
router.get("/get-ProfileData", authenticateToken, getProfileDataController);
router.patch(
  "/update-ProfileData",
  authenticateToken,
  updateProfileDataController,
);

export default router;
