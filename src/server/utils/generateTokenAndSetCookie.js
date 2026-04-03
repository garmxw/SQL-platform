import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

export function generateTokenAndSetCookie(user, res, rememberMe = false) {
  // 1. Define durations: 7 days if remembered, 24 hours if not
  const tokenExpiry = rememberMe ? "7d" : "24h";
  const cookieMaxAge = rememberMe
    ? 7 * 24 * 60 * 60 * 1000 // 7 days
    : 24 * 60 * 60 * 1000; // 24 hours

  const token = jwt.sign(
    {
      userId: user.id,
      role: user.user_role,
    },
    process.env.JWT_SECRET,
    { expiresIn: tokenExpiry }, // Use dynamic expiry
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(process.env.NODE_ENV === "production"
      ? { domain: process.env.DOMAIN }
      : {}), // ← in dev: NO domain → cookie is bound to exact hostname
    maxAge: cookieMaxAge, // Use dynamic maxAge
  });

  return token;
}
