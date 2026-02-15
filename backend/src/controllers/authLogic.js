import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { is_user_exists, create_user } from "../services/userQueries.js";
import { generateVerificationCode } from "../utils/generateVerificationCode.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendVerificationEmail } from "../mail/utils/sendVerificationEmail.js";
import { saveVerificationCodeHash } from "../services/userQueries.js";

export const signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    //check if user or username exists
    const existingUser = await is_user_exists(email, username);
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
  res.send("Login endpoint");
  try {
    const { email, password } = req.body;
    // check if user exists
    const existingUser = await is_user_exists(email, null);
    // existingUser.rows[0].length === 0 means no user found with the provided email
    if (!existingUser) {
      return res.status(401).json({
        status: "failed",
        message: "Invalid email or password, please try again",
      });
    }
    const user = existingUser.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "failed",
        message: "Invalid email or password, please try again",
      });
    }
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.user_role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    res.status(200).json({
      status: "success",
      message: "User logged in successfully",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          user_role: user.user_role,
        },
        token: token,
      },
    });
  } catch (err) {
    console.error("Error during signup:", err);
    res.status(500).json({
      status: "error",
      message: "An error occurred during login. Please try again later.",
    });
  }
};

export const logout = (req, res) => {};

export const forgotPassword = (req, res) => {};

export const resetPassword = (req, res) => {};
