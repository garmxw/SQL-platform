import { MailtrapClient } from "mailtrap";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.MAILTRAP_KEY;

export const mailtrapClient = new MailtrapClient({
  token: TOKEN,
});

export const sender = {
  email: process.env.MAILTRAP_EMAIL_SEND,
  name: "Vorn Team",
};

//the tutorial from mailtrap docs down below (we didn't user their methode we created our custom one in mail/utils/sendVerificationEmail.js), but we can use it as a reference for sending emails in the future if needed:

// export const recipients = [
//   {
//     email: process.env.MAILTRAP_EMAIL_RECEIVE,
//   },
// ];
// mailtrapClient
//   .send({
//     from: sender,
//     to: recipients,
//     subject: "You are awesome!",
//     text: "Congrats for sending test email with Mailtrap!",
//     category: "Integration Test",
//   })
//   .then(console.log, console.error);
