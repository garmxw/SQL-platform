import { mailtrapClient, sender } from "../mailtrap.js";
import {
  verificationEmailTemplate,
  verificationEmailTest,
} from "./Template.js";

export async function sendVerificationEmail(
  username,
  email,
  code,
  requestTime,
) {
  const recipients = [{ email }];

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: "Verify your identity",
      html: verificationEmailTest
        .replaceAll("{verificationCode}", code)
        .replaceAll("{userEmail}", email)
        .replaceAll("{userName}", username)
        .replaceAll("{requestTime}", requestTime),
      category: "Email Verification",
    });
    console.log("Verification email sent successfully");
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email: " + error.message);
  }
}
