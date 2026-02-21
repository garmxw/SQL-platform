import { mailtrapClient, sender } from "../mailtrap.js";
import { changeSuccessfully } from "./Template.js";

export async function sendResetSuccessEmail(email, passReset, emailReset) {
  const recipients = [{ email }];

  let subject = "Notification";

  if (passReset) subject = "Password reseted succefully";
  if (emailReset) subject = "Email reseted succefully";

  try {
    const response = await mailtrapClient.send({
      from: sender,
      to: recipients,
      subject: `${subject}`,
      html: changeSuccessfully.replaceAll("{userEmail}", email),
      category: "Reset Email",
    });
    console.log("Reset email sent successfully");
  } catch (error) {
    console.error("Error sending Reset email:", error);
    throw new Error("Failed to send Reset email: " + error.message);
  }
}
