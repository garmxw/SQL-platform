export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "failed",
        message: "Access denied. User is not authorized.",
      });
    }
    next();
  };
};
