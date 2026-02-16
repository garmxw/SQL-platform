import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  findUserBy_email_Or_username,
  create_user,
  updateLoginHistory,
} from "../services/userQueries.js";
import { generateVerificationCode } from "../utils/generateVerificationCode.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendVerificationEmail } from "../mail/utils/sendVerificationEmail.js";
import { saveVerificationCodeHash } from "../services/userQueries.js";

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

export const forgotPassword = (req, res) => {};

export const resetPassword = (req, res) => {};
