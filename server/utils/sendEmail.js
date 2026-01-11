// utils/sendEmail.js
import { Resend } from "resend";
import { newBookEmailTemplate } from "./emailTemplate.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendNewBookEmail = async (emails, book) => {
  if (!emails || emails.length === 0) return;

  try {
    await resend.emails.send({
      from: "Book Cart <onboarding@resend.dev>",
      to: emails,
      subject: `📚 New Book Added: ${book.title}`,
      html: newBookEmailTemplate(book),
    });
  } catch (err) {
    console.error("❌ Email failed:", err.message);
  }
};
