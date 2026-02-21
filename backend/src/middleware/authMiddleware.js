import jwt from "jsonwebtoken";

// Middleware to authenticate JWT token (protected routes)
export const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  // If no token is found, block access
  if (!token) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized Access, Token is missing",
    });
  }
  try {
    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) {
      return res.status(401).json({
        status: "failed",
        message: "Unauthorized access, Invalid token",
      });
    }
    // attach decoded payload to the request
    req.user = decodedToken;
    next();
  } catch (err) {
    console.log("Error in verifying token: ", err);
    return res.status(500).json({
      status: "failed",
      message: "Server Error",
    });
  }
};
