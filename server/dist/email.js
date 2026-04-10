"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendConfirmationEmail = sendConfirmationEmail;
exports.sendReferralRewardEmail = sendReferralRewardEmail;
exports.sendReferralWelcomeEmail = sendReferralWelcomeEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
// src/server/email.ts
const resend_1 = require("resend");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
async function sendConfirmationEmail(to, userReferralCode, generatedPassword) {
    console.log("📤 Sending welcome email to:", to);
    try {
        const referralSection = userReferralCode ? `
      <div style="background: linear-gradient(135deg, #FFB8E0, #BE9EFF, #88C0FC, #86FF99); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
        <h3 style="color: #000; margin: 0 0 10px 0;">Your Referral Code</h3>
        <h2 style="color: #000; font-size: 24px; font-weight: bold; margin: 0 0 10px 0; letter-spacing: 1px;">${userReferralCode}</h2>
        <p style="color: #000; margin: 0; font-size: 14px;">Share this code with friends and you'll both get a free month!</p>
      </div>
    ` : '';
        const { data, error } = await resend.emails.send({
            from: 'BRUTE <info@brutegym.com>',
            to,
            subject: 'Welcome to BRUTE 💪',
            html: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000B1A; color: white; padding: 20px;">
          <h2 style="color: #246BFD; text-align: center; margin-bottom: 20px;">Welcome to BRUTE 💪</h2>
          
          <p style="font-size: 16px; line-height: 1.6;">
            You're all set! Welcome to the BRUTE community. Let's get those gains! 
          </p>
          
          ${referralSection}
          
          <div style="background: #262A34; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #246BFD; margin-top: 0;">What's Next?</h3>
            <ul style="color: #5E6272; line-height: 1.8;">
              <li>Log into your dashboard</li>
              <li>Set up your first workout program</li>
              <li>Track your progress and smash your goals</li>
              ${userReferralCode ? '<li>Share your referral code with friends for free months!</li>' : ''}
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL}/dashboard" 
               style="background: #246BFD; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              Get Started Now
            </a>
          </div>
          
          <p style="text-align: center; color: #5E6272; font-size: 12px; margin-top: 30px;">
            Need help? Reply to this email or contact us at info@brutegym.com
          </p>
        </div>
      `,
        });
        if (error) {
            console.error("❌ Email send error:", error);
        }
        else {
            console.log("✅ Welcome email sent:", data?.id);
        }
    }
    catch (err) {
        console.error("❌ Unexpected email send failure:", err);
    }
}
async function sendReferralRewardEmail(referrerEmail, referrerName, newUserName, newUserEmail) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'BRUTE <info@brutegym.com>',
            to: referrerEmail,
            subject: '🎉 You earned a referral reward!',
            html: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000B1A; color: white; padding: 20px;">
          <h2 style="color: #246BFD; text-align: center; margin-bottom: 20px;">Congratulations ${referrerName}! 🎉</h2>
          
          <div style="background: linear-gradient(135deg, #FFB8E0, #BE9EFF, #88C0FC, #86FF99); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <h3 style="color: #000; margin: 0 0 10px 0;">🎁 FREE MONTH EARNED!</h3>
            <p style="color: #000; margin: 0; font-weight: bold;">Your friend ${newUserName} just joined BRUTE!</p>
          </div>
          
          <div style="background: #262A34; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="font-size: 16px; line-height: 1.6; margin: 0;">
              <strong>${newUserName}</strong> (${newUserEmail}) just subscribed to BRUTE using your referral code.
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #246BFD; font-weight: bold;">
              You've both earned a free month! 💪
            </p>
          </div>
          
          <div style="background: #262A34; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #246BFD; margin-top: 0;">Keep Sharing, Keep Earning!</h3>
            <p style="color: #5E6272; line-height: 1.6;">
              Every friend you refer gets a free month, and so do you. There's no limit to how many free months you can earn!
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL}/settings" 
               style="background: #246BFD; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              View Your Referral Stats
            </a>
          </div>
          
          <p style="text-align: center; color: #5E6272; font-size: 12px; margin-top: 30px;">
            Questions? Reply to this email or contact us at info@brutegym.com
          </p>
        </div>
      `,
        });
        if (error) {
            console.error("❌ Referral reward email error:", error);
        }
        else {
            console.log("✅ Referral reward email sent:", data?.id);
        }
    }
    catch (error) {
        console.error('❌ Failed to send referral reward email:', error);
    }
}
async function sendReferralWelcomeEmail(to, referrerName, userReferralCode) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'BRUTE <info@brutegym.com>',
            to,
            subject: 'Welcome to BRUTE - Your free month is active! 💪',
            html: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000B1A; color: white; padding: 20px;">
          <h2 style="color: #246BFD; text-align: center; margin-bottom: 20px;">Welcome to BRUTE! 💪</h2>
          
          <div style="background: linear-gradient(135deg, #FFB8E0, #BE9EFF, #88C0FC, #86FF99); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <h3 style="color: #000; margin: 0 0 10px 0;">🎉 FREE MONTH ACTIVATED!</h3>
            <p style="color: #000; margin: 0; font-weight: bold;">Thanks to ${referrerName}, you have another month of BRUTE completely FREE!</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">
            You've joined BRUTE through a friend's referral, which means you get an additional month free (on top of your 1-month free trial)! 
            Welcome to the community - let's get those gains together! 
          </p>
          
          <div style="background: linear-gradient(135deg, #FFB8E0, #BE9EFF, #88C0FC, #86FF99); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <h3 style="color: #000; margin: 0 0 10px 0;">Your Referral Code</h3>
            <h2 style="color: #000; font-size: 24px; font-weight: bold; margin: 0 0 10px 0; letter-spacing: 1px;">${userReferralCode}</h2>
            <p style="color: #000; margin: 0; font-size: 14px;">Share this code with friends and you'll both get a free month!</p>
          </div>
          
          <div style="background: #262A34; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #246BFD; margin-top: 0;">What's Next?</h3>
            <ul style="color: #5E6272; line-height: 1.8;">
              <li>Log into your dashboard</li>
              <li>Set up your first workout program</li>
              <li>Track your progress and smash your goals</li>
              <li>Share your referral code with friends for more free months!</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.CLIENT_URL}/dashboard" 
               style="background: #246BFD; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              Get Started Now
            </a>
          </div>
          
          <p style="text-align: center; color: #5E6272; font-size: 12px; margin-top: 30px;">
            Need help? Reply to this email or contact us at info@brutegym.com
          </p>
        </div>
      `,
        });
        if (error) {
            console.error("❌ Referral welcome email error:", error);
        }
        else {
            console.log("✅ Referral welcome email sent:", data?.id);
        }
    }
    catch (error) {
        console.error('❌ Failed to send referral welcome email:', error);
    }
}
// Fixed password reset email function
async function sendPasswordResetEmail(email, token) {
    console.log("📤 Sending password reset email to:", email);
    try {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
        const { data, error } = await resend.emails.send({
            from: 'BRUTE <info@brutegym.com>',
            to: email,
            subject: 'Reset your BRUTE password 🔒',
            html: `
        <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000B1A; color: white; padding: 20px;">
          <h2 style="color: #246BFD; text-align: center; margin-bottom: 20px;">Reset Your Password 🔒</h2>
          
          <div style="background: #262A34; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
              We received a request to reset your password for your BRUTE account.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin: 0;">
              Click the button below to reset your password. This link will expire in 1 hour.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #246BFD; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <div style="background: #262A34; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="color: #5E6272; font-size: 14px; line-height: 1.6; margin: 0;">
              If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>
          
          <p style="text-align: center; color: #5E6272; font-size: 12px; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <span style="color: #246BFD; word-break: break-all;">${resetUrl}</span>
          </p>
          
          <p style="text-align: center; color: #5E6272; font-size: 12px; margin-top: 20px;">
            Need help? Reply to this email or contact us at info@brutegym.com
          </p>
        </div>
      `,
        });
        if (error) {
            console.error("❌ Password reset email error:", error);
            throw error;
        }
        else {
            console.log("✅ Password reset email sent:", data?.id);
        }
    }
    catch (err) {
        console.error("❌ Unexpected password reset email failure:", err);
        throw err;
    }
}
