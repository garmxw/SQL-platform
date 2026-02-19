import { mailtrapClient, sender } from "../mailtrap.js";
import { resetPasswordEmailTemplate } from "./Template.js";

export async function sendPasswordResetEmail(email, resetUrl) {
  const recipients = [{ email }];

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: "Reset your password",
      html: resetPasswordEmailTemplate.replaceAll("{resetURL}", resetUrl),
      category: "Password Reset",
    });
    console.log("Reset pass email sent successfully");
  } catch (error) {
    console.error("Error sending Reset password email:", error);
    throw new Error("Failed to send Reset password email: " + error.message);
  }
}
