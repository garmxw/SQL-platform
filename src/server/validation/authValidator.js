import { body } from "express-validator";

const signupValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .bail()
    .isLength({ min: 3, max: 30 })
    .withMessage(
      "Username must be at least 3 characters long and no more than 30",
    )
    .bail()
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores")
    .bail(),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Invalid email format")
    .bail()
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .bail()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .bail()
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .bail()
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter")
    .bail()
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number")
    .bail()
    .matches(/[@$!%*?&]/)
    .withMessage(
      "Password must contain at least one special character (@, $, !, %, *, ?, &)",
    )
    .bail(),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  body("agree")
    .isBoolean()
    .custom((value) => {
      if (value !== true) {
        throw new Error("You must agree to the terms and conditions");
      }
      return true;
    }),
];

const loginValidation = [
  // 1. Ensure the login method is valid
  body("method")
    .isIn(["email", "username"])
    .withMessage("Invalid login method"),

  // 2. Validate the identifier based on the method
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage((value, { req }) =>
      req.body.method === "email"
        ? "Email is required"
        : "Username is required",
    )
    .bail()
    // If it's an email method, run email checks
    .if((value, { req }) => req.body.method === "email")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
    .bail(),

  body("identifier")
    .if((value, { req }) => req.body.method === "username")
    // If it's a username method, run username checks
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores")
    .bail(),

  // 3. Password check remains simple
  body("password").notEmpty().withMessage("Password is required"),

  // 4. Validate rememberMe (optional boolean)
  body("rememberMe")
    .optional()
    .isBoolean()
    .withMessage("Remember me must be a boolean"),
];

export { signupValidation, loginValidation };
