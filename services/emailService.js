import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection configuration
    this.verifyConnection();
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connected successfully');
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
    }
  }

  async sendWelcomeEmail(userEmail, username) {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: userEmail,
      subject: '🎉 Welcome to ColabNotes!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to ColabNotes!</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333;">Hello ${username}! 👋</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Thank you for joining ColabNotes! We're excited to have you on board.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">🚀 Get Started:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>Create your first collaborative note</li>
                <li>Invite team members to collaborate</li>
                <li>Explore our powerful editing features</li>
                <li>Set up your profile preferences</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center;">
              If you have any questions, feel free to reach out to our support team.
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center;">
            <p style="color: #999; margin: 0; font-size: 14px;">
              © 2024 ColabNotes. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(userEmail, username, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: userEmail,
      subject: '🔐 Password Reset Request - ColabNotes',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc3545; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🔐 Password Reset</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333;">Hello ${username},</h2>
            
            <p style="color: #666; line-height: 1.6;">
              We received a request to reset your password for your ColabNotes account.
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0;">
                <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset My Password
              </a>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">📋 Reset Instructions:</h3>
              <ol style="color: #666; line-height: 1.8;">
                <li>Click the "Reset My Password" button above</li>
                <li>Enter your new password (minimum 8 characters)</li>
                <li>Confirm your new password</li>
                <li>Log in with your new credentials</li>
              </ol>
            </div>
            
            <p style="color: #999; font-size: 14px;">
              <strong>Note:</strong> This reset link will expire in 1 hour for security reasons.
            </p>
            
            <p style="color: #999; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center;">
            <p style="color: #999; margin: 0; font-size: 14px;">
              © 2024 ColabNotes. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  async sendUsernameRecoveryEmail(userEmail, username) {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: userEmail,
      subject: '👤 Username Recovery - ColabNotes',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #28a745; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">👤 Username Recovery</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333;">Username Recovery Request</h2>
            
            <p style="color: #666; line-height: 1.6;">
              We received a request to recover the username associated with this email address.
            </p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #28a745;">
              <h3 style="color: #333; margin-top: 0;">📧 Your Username:</h3>
              <p style="font-size: 24px; font-weight: bold; color: #28a745; margin: 10px 0; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                ${username}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/login" 
                 style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Login
              </a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0;">
                <strong>🔒 Security Tip:</strong> If you didn't request this username recovery, someone may be trying to access your account. Consider changing your password.
              </p>
            </div>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center;">
            <p style="color: #999; margin: 0; font-size: 14px;">
              © 2024 ColabNotes. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Username recovery email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send username recovery email:', error);
      return false;
    }
  }

  async sendLoginNotificationEmail(userEmail, username, loginInfo) {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: userEmail,
      subject: '🔐 New Login to Your ColabNotes Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #17a2b8; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🔐 Login Notification</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333;">Hello ${username},</h2>
            
            <p style="color: #666; line-height: 1.6;">
              We detected a new login to your ColabNotes account.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">📊 Login Details:</h3>
              <ul style="color: #666; line-height: 1.8; list-style: none; padding: 0;">
                <li><strong>🕐 Time:</strong> ${loginInfo.timestamp}</li>
                <li><strong>🌐 IP Address:</strong> ${loginInfo.ip || 'Unknown'}</li>
                <li><strong>💻 Device:</strong> ${loginInfo.userAgent || 'Unknown'}</li>
                <li><strong>📍 Location:</strong> ${loginInfo.location || 'Unknown'}</li>
              </ul>
            </div>
            
            <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #0c5460; margin: 0;">
                <strong>✅ Was this you?</strong> If you recognize this login, no action is needed.
              </p>
            </div>
            
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #721c24; margin: 0;">
                <strong>⚠️ Suspicious activity?</strong> If you don't recognize this login, please change your password immediately and contact support.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/security" 
                 style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
                Change Password
              </a>
              <a href="${process.env.FRONTEND_URL}/dashboard" 
                 style="background: #17a2b8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center;">
            <p style="color: #999; margin: 0; font-size: 14px;">
              © 2024 ColabNotes. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Login notification email sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send login notification email:', error);
      return false;
    }
  }
async sendVerificationEmail(userEmail, username, token) {
  const verifyUrl = `http://localhost:5000/api/auth/verify?token=${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: userEmail,
    subject: "✅ Verify Your Email - Complete Registration",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #28a745; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">✉️ Email Verification</h1>
        </div>

        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">Hello ${username},</h2>

          <p style="color: #555; line-height: 1.6;">
            Welcome to <strong>ColabNotes</strong>! 🎉 <br>
            Please verify your email address to activate your account. 
            Just click the button below to complete the process:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" 
               style="background: #28a745; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px;">
              ✅ Verify My Email
            </a>
          </div>

          <p style="color: #777; font-size: 14px; line-height: 1.6;">
            If the button above doesn’t work, copy and paste the link below into your browser:
          </p>

          <p style="color: #0069d9; word-wrap: break-word; font-size: 14px;">
            ${verifyUrl}
          </p>

          <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <p style="color: #856404; margin: 0;">
              ⚠️ This verification link will expire in <strong>1 hour</strong>. Please verify your email before then.
            </p>
          </div>
        </div>

        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            © ${new Date().getFullYear()} ColabNotes. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await this.transporter.sendMail(mailOptions);
    console.log(`📨 Verification email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send verification email:", error);
    return false;
  }
}



}







// Create singleton instance
const emailService = new EmailService();

export default emailService;