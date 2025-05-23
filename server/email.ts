// src/server/email.ts
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendConfirmationEmail(to: string) {
      console.log("📤 Sending test email to:", to);
try {
    const { data, error } = await resend.emails.send({
      from: 'BRUTE <info@brutegym.com>',
      to,
      subject: 'Welcome to BRUTE 💪',
      html: `<h2>Welcome to BRUTE</h2><p>You're all set. Let's get those gains! 💪</p>`,
    });

    if (error) {
      console.error("❌ Email send error:", error);
    } else {
      console.log("✅ Email sent:", data?.id);
    }
  } catch (err) {
    console.error("❌ Unexpected email send failure:", err);
  }
}
