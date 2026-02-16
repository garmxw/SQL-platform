import { mailtrapClient, sender } from "../mailtrap.js";
import { welcomeEmailTemplate } from "./Template.js";

export async function sendWelcomeEmail(email, username) {
  const recipients = [{ email }];

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: "Welcome to vorn!",
      html: welcomeEmailTemplate
        .replaceAll("{userEmail}", email)
        .replaceAll("{userName}", username),
      category: "Welcome Email",
    });
    console.log("Welcome email sent successfully");
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email: " + error.message);
  }
}
