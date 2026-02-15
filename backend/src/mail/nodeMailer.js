// needs testing just wrote it for later use

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
//Create a transporter (The "Connection" to the email server)
const transporter = nodemailer.createTransport({
  host: "gmail",
  port: 2525,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export function sendEmailWithNodeMailer(
  sender,
  recipients,
  subject,
  text,
  html,
) {
  recipients.forEach((mail) => {
    //Define the email options
    const mailOptions = {
      from: {
        name: sender,
        email: process.env.EMAIL_USER,
      },
      to: mail,
      subject: subject,
      text: text,
      html: html,
    };

    //Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log("Error:", error);
      }
      console.log("Email sent: " + info.response);
    });
  });
}
