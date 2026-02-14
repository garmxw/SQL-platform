import jwt from "jsonwebtoken";

// Middleware to authenticate JWT token (protected routes)
export const authenticateToken = (req, res, next) => {
  try {
    let token;
    // check if the authorization header is present
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      // Extract the token from the header
      token = req.headers.authorization.split(" ")[1];
    }
    // If no token is found, block access
    if (!token) {
      return res.status(401).json({
        status: "failed",
        message: "Unauthorized access, token is missing",
      });
    }
    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    // attach decoded payload to the request
    req.user = decodedToken;
    next();
  } catch (err) {
    return res.status(401).json({
      status: "failed",
      message: "Unauthorized access",
    });
  }
};
