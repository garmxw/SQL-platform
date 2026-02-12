import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { is_user_exists, create_user } from "../services/userQueries.js";

export const signup = async (req, res) => {
  res.send("Signup endpoint");
  try {
    const { username, email, password } = req.body;

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

    const user = newUser.rows[0];
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.user_role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

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
