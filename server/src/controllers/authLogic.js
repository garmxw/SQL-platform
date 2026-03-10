import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";
import {
  findUserBy_email_Or_username,
  create_user,
  updateLoginHistory,
  find_user_by_token,
  updatePassword,
} from "../services/userQueries.js";
import { generateVerificationCode } from "../utils/generateVerificationCode.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendVerificationEmail } from "../mail/utils/sendVerificationEmail.js";
import { sendPasswordResetEmail } from "../mail/utils/sendPasswordResetEmail.js";
import { sendResetSuccessEmail } from "../mail/utils/sendResetSuccessEmail.js";
import { saveVerificationCodeHash } from "../services/userQueries.js";

dotenv.config();

export const signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    //check if user or username exists
    const existingUser = await findUserBy_email_Or_username(email, username);
    if (existingUser) {
      return res.status(409).json({
        status: "error",
        message: "email or username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12); //save user to database

    const newUser = await create_user(username, email, hashedPassword);
    //create user object and token
    const user = newUser.rows[0];

    // Implement this function to generate a unique verification code
    // it returns an object with the code, its hash, and expiry time
    const verificationData = await generateVerificationCode();
    //debugging logs
    console.log(user);
    console.log(verificationData);
    //save the verification hash to the db
    await saveVerificationCodeHash(
      user.id,
      verificationData.hash,
      verificationData.ExpiryDate,
    );

    const token = generateTokenAndSetCookie(user, res);
    const requestTime = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    /*send verification email to the user (this is working i just run out of the free email credits, but gonna do it with node
    mailer later)*/
    /*await sendVerificationEmail(
      user.username,
      user.email,
      verificationData.code,
      requestTime,
    );*/

    res.status(201).json({
      status: "success",
      message: "User created successfully",
      data: { user: user, token: token },
    });
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).json({
      status: "error",
      message: "An error occurred during signup. Please try again later.",
      sendingEmailError: err.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // check if user exists
    const existingUser = await findUserBy_email_Or_username(email, null);

    // existingUser.rows[0].length === 0 means no user found with the provided email
    if (!existingUser) {
      return res.status(401).json({
        status: "failed",
        message: "Invalid cerdentials, please try again",
      });
    }
    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password_hash,
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "failed",
        message: "Invalid credentials, please try again",
      });
    }

    const token = generateTokenAndSetCookie(existingUser, res);
    await updateLoginHistory(existingUser.id);

    // res.status(200).json({
    //   status: "success",
    //   message: "User logged in successfully",
    //   data: {
    //     user: {
    //       id: existingUser.id,
    //       username: existingUser.username,
    //       email: existingUser.email,
    //       user_role: existingUser.user_role,
    //       last_login: existingUser.last_login,
    //     },
    //     token: token,
    //   },
    // });

    res.status(201).json({
      status: "success",
      message: "Logged in successfully",
      data: {
        ...existingUser,
        password: undefined,
        verification_hash: undefined,
        verification_expires_at: undefined,
        token: token,
      },
    });
  } catch (err) {
    console.error("Error during Login:", err);
    res.status(500).json({
      status: "error",
      message: "An error occurred during login. Please try again later.",
    });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Error during Login:", err);
    res.status(500).json({
      status: "error",
      message: "An error occurred during logout. Please try again later.",
    });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await findUserBy_email_Or_username(email, null);

    if (!user) {
      return res.status(400).json({
        status: "failed",
        message: "User not found, Try with another emai",
      });
    }

    // token for the reset link
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); //30 minutes
    console.log("Rest token from forgetPass: ", resetToken);

    await saveVerificationCodeHash(user.id, resetToken, resetTokenExpiresAt);
    //sending email
    // await sendPasswordResetEmail(
    //   user.email,
    //   `${process.env.CLIENT_URL}/reset-password/${resetToken}`, // react app link
    // );

    res.status(200).json({
      status: "success",
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.log("Error in forget password: ", error);
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  if (!password || !token) {
    return res.status(400).json({
      status: "error",
      message: "Something wrong happend, Try again",
    });
  }

  try {
    const user = await find_user_by_token(token);
    if (!user) {
      throw new Error("Invalid or expired token");
    }
    const hashedPssword = await bcrypt.hash(password, 12);
    await updatePassword(user.id, hashedPssword);
    //send reset succes email
    //await sendResetSuccessEmail(user.email, true, false); // flags

    res
      .status(200)
      .json({ status: "success", message: "Password reset successfully" });
  } catch (error) {
    console.log("Error in reset password: ", error);
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const user = await find_user_by_id(req.user.userId);
    if (!user) {
      return res
        .status(400)
        .json({ status: "failed", message: "User not found" });
    }

    res.status(200).json({ status: "success", user: { ...user } });
  } catch (error) {}
};
