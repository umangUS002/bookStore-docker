// utils/sendEmail.js
import nodemailer from "nodemailer";
import { newBookEmailTemplate } from "./emailTemplate.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// optional: verify once on startup
transporter.verify((err) => {
  if (err) {
    console.error("❌ Email transporter error:", err);
  } else {
    console.log("✅ Email transporter ready");
  }
});

export const sendNewBookEmail = async (emails, book) => {
  if (!emails || emails.length === 0) return;

  try {
    await transporter.sendMail({
      from: `"Book Cart 📚" <${process.env.EMAIL_USER}>`,
      bcc: emails, // ✅ BEST PRACTICE
      subject: `📚 New Book Added: ${book.title}`,
      html: newBookEmailTemplate(book),
    });

    console.log("📨 New book email sent to subscribers");
  } catch (err) {
    console.error("❌ Failed to send new book email:", err.message);
  }
};
