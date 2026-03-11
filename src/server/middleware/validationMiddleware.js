import { validationResult } from "express-validator";

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      errors: errors.array().map((err) => {
        return { field: err.path, message: err.msg };
      }),
    });
  }
  next();
};

export default validationMiddleware;
