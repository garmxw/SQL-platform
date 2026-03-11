import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function generateTokenAndSetCookie(user, res) {
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.user_role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN },
  );
  res.cookie("token", token, {
    httpOnly: true, // Prevents JavaScript access to the cookie (XSS protection)
    secure: process.env.NODE_ENV === "production", // Ensures the cookie is only sent over HTTPS in production
    sameSite: "strict", // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie expires in 7 days
  });
  return token;
}
