// src/server/email.ts
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendConfirmationEmail(to: string, userReferralCode?: string) {
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
    } else {
      console.log("✅ Welcome email sent:", data?.id);
    }
  } catch (err) {
    console.error("❌ Unexpected email send failure:", err);
  }
}

export async function sendReferralRewardEmail(referrerEmail: string, referrerName: string, newUserName: string, newUserEmail: string) {
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
    } else {
      console.log("✅ Referral reward email sent:", data?.id);
    }
  } catch (error) {
    console.error('❌ Failed to send referral reward email:', error);
  }
}

export async function sendReferralWelcomeEmail(to: string, referrerName: string, userReferralCode: string) {
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
            <p style="color: #000; margin: 0; font-weight: bold;">Thanks to ${referrerName}, your first month is FREE!</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">
            You've joined BRUTE through a friend's referral, which means you get your first month completely free! 
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
    } else {
      console.log("✅ Referral welcome email sent:", data?.id);
    }
  } catch (error) {
    console.error('❌ Failed to send referral welcome email:', error);
  }
}