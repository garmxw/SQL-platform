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

const router = Router();

router.post("/signup", signupValidation, validationMiddleware, signup);
router.post("/login", loginValidation, validationMiddleware, login);
router.post("/logout" /*,logoutMiddleware*/, logout);
router.post("/forgot-password" /*,forgetPasswordMiddleware*/, forgotPassword);
router.post("/reset-password" /*,resetPasswordMiddleware*/, resetPassword);

export default router;

//need to build those commented middlewares and add them to the routes when they are ready
