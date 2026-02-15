import { Router } from "express";
import {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/authLogic.js";
import {
  signupValidation,
  loginValidation,
} from "../validation/authValidator.js";
import validationMiddleware from "../middleware/validationMiddleware.js";
import { verifyEmail } from "../middleware/verifyEmail.js";

const router = Router();

router.post("/signup", signupValidation, validationMiddleware, signup);
router.post("/login", loginValidation, validationMiddleware, login);
router.post("/verify-email", verifyEmail);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;

//need to build those commented middlewares and add them to the routes when they are ready
