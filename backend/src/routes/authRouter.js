import { Router } from "express";
import {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  checkAuth,
} from "../controllers/authLogic.js";
import {
  signupValidation,
  loginValidation,
} from "../validation/authValidator.js";
import { verifyEmail } from "../controllers/verifyEmail.js";
import validationMiddleware from "../middleware/validationMiddleware.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

//authenticateToken	Middleware	Checks if the user is logged in (verifies the cookie)
//authorizeRoles	Middleware	Checks if the logged-in user has the right "clearance" (Admin, student, etc.)
//checkAuth	Controller	Sends the user's data back to the frontend (The final destination)

const router = Router();
//public routes (no need for token)
router.post("/signup", signupValidation, validationMiddleware, signup);
router.post("/login", loginValidation, validationMiddleware, login);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
//protected routes (needs authenticateToken)
router.post("/logout", authenticateToken, logout);

// route for frontend, It uses the token to find the user and return their data
router.get("/check-auth", authenticateToken, checkAuth);
//testing routes
router.get(
  "/admin-testAuth",
  authenticateToken,
  authorizeRoles("admin"),
  (req, res) => {
    res.status(200).json({
      status: "success",
      message: "Welcome admin",
    });
  },
);
router.get(
  "/student-testAuth",
  authenticateToken,
  authorizeRoles("student"),
  (req, res) => {
    res.status(200).json({
      status: "success",
      message: "Welcome student",
    });
  },
);

export default router;
