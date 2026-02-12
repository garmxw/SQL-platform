import { Router } from "express";
import { signup, login } from "../controllers/authLogic.js";
import {
  signupValidation,
  loginValidation,
} from "../validation/authValidator.js";
import validationMiddleware from "../middleware/validationMiddleware.js";

const router = Router();

router.post("/signup", signupValidation, validationMiddleware, signup);
router.post("/login", loginValidation, validationMiddleware, login);

export default router;
