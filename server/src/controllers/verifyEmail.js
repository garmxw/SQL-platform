import crypto from "crypto";
import { findUserBy_email_Or_username } from "../services/userQueries.js";
import dotenv from "dotenv";
import { markUserAsVerified } from "../services/userQueries.js";
//import { sendWelcomeEmail } from " ../mail/utils/sendWelcomeEmail.js";

dotenv.config();

export const verifyEmail = async (req, res) => {
  const { code, email } = req.body;
  try {
    if (!code) {
      return res.status(400).json({
        status: "failed",
        message: "Verification code is required",
      });
    }
    const secret = process.env.VERIFICATION_CODE_SECRET; // Use the same secret key from environment variables
    const user = await findUserBy_email_Or_username(email, null);
    console.log("user from db:", user);
    if (!user) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid verification code",
      });
    }
    if (new Date() > new Date(user.verification_expires_at)) {
      return res.status(400).json({
        status: "failed",
        message: "Verification code has expired",
      });
    }

    const data = `${code}.${user.verification_expires_at}`;
    //decode the hash using the same secret and data
    const hash = crypto.createHmac("sha256", secret).update(data).digest("hex");
    console.log("hash:", hash);

    if (hash !== user.verification_hash) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid verification code",
      });
    }

    // If the code is valid, you can update the user's record to mark him as verified
    await markUserAsVerified(user.id); // Implement this function to update the user's record in the database

    //await sendWelcomeEmail(user.email, user.username);

    // Implemented this function to send a confirmation email to the user (it working but im out of email credits in mailtrap)

    return res.status(200).json({
      status: "success",
      message: "Email verified successfully",
      user: {
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    return res.status(500).json({
      status: "failed",
      message: "Internal server error",
    });
  }
};
