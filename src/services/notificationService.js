const nodemailer = require('nodemailer');
const twilio = require('twilio');

class NotificationService {
  constructor() {
    // Initialize email transporter only if SMTP credentials are provided
    this.emailTransporter = null;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        this.emailTransporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          },
          tls: {
            rejectUnauthorized: false // needed for some hosting providers like Bluehost
          }
        });
      } catch (error) {
        console.error('Failed to initialize email transporter:', error);
      }
    }

    // Initialize Twilio client (if credentials provided)
    this.smsClient = null;
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.smsClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
  }

  // Send magic link via email
  async sendMagicLinkEmail(email, token, firstName) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
    }
    const magicLinkUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/magic-login?token=${token}`;
    
    const mailOptions = {
      from: `"SOBIE Conference" <${process.env.FROM_EMAIL || 'noreply@sobie.org'}>`,
      to: email,
      subject: 'SOBIE - Your Magic Sign-In Link',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SOBIE Magic Sign-In</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background-color: #f9fafb; }
            .button { 
              display: inline-block; 
              background-color: #3b82f6; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SOBIE Conference Platform</h1>
            </div>
            <div class="content">
              <h2>Hello${firstName ? ` ${firstName}` : ''}!</h2>
              <p>You requested to sign in to your SOBIE Conference account. Click the button below to sign in instantly:</p>
              
              <div style="text-align: center;">
                <a href="${magicLinkUrl}" class="button">Sign In to SOBIE</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
                ${magicLinkUrl}
              </p>
              
              <div class="warning">
                <strong>Security Notice:</strong>
                <ul>
                  <li>This link will expire in 10 minutes</li>
                  <li>It can only be used once</li>
                  <li>If you didn't request this link, you can safely ignore this email</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent to ${email} by the SOBIE Conference Platform.</p>
              <p>If you have questions, please contact support.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello${firstName ? ` ${firstName}` : ''}!

You requested to sign in to your SOBIE Conference account. Use this link to sign in:

${magicLinkUrl}

This link will expire in 10 minutes and can only be used once.
If you didn't request this link, you can safely ignore this email.

SOBIE Conference Platform
      `
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      return { success: true, method: 'email' };
    } catch (error) {
      console.error('Error sending magic link email:', error);
      throw new Error('Failed to send magic link email');
    }
  }

  // Send magic link via SMS
  async sendMagicLinkSMS(phoneNumber, token, firstName) {
    if (!this.smsClient) {
      throw new Error('SMS service not configured');
    }

    const magicLinkUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/magic-login?token=${token}`;
    
    const message = `Hello${firstName ? ` ${firstName}` : ''}! Your SOBIE sign-in link: ${magicLinkUrl} (Expires in 10 min)`;

    try {
      await this.smsClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      return { success: true, method: 'sms' };
    } catch (error) {
      console.error('Error sending magic link SMS:', error);
      throw new Error('Failed to send magic link SMS');
    }
  }

  // Send email verification
  async sendEmailVerification(email, token, firstName) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
    }
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;
    
    const mailOptions = {
      from: `"SOBIE Conference" <${process.env.FROM_EMAIL || 'noreply@sobie.org'}>`,
      to: email,
      subject: 'SOBIE - Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SOBIE Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #059669; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background-color: #f9fafb; }
            .button { 
              display: inline-block; 
              background-color: #10b981; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to SOBIE!</h1>
            </div>
            <div class="content">
              <h2>Hello${firstName ? ` ${firstName}` : ''}!</h2>
              <p>Thank you for creating your SOBIE Conference account. To complete your profile setup, please verify your email address:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
                ${verificationUrl}
              </p>
              
              <p><strong>Note:</strong> This verification link will expire in 24 hours.</p>
            </div>
            <div class="footer">
              <p>This email was sent to ${email} by the SOBIE Conference Platform.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello${firstName ? ` ${firstName}` : ''}!

Thank you for creating your SOBIE Conference account. To complete your profile setup, please verify your email address by clicking this link:

${verificationUrl}

This verification link will expire in 24 hours.

SOBIE Conference Platform
      `
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw new Error('Failed to send email verification');
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, token, firstName) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
    }
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
    
    const mailOptions = {
      from: `"SOBIE Conference" <${process.env.FROM_EMAIL || 'noreply@sobie.org'}>`,
      to: email,
      subject: 'SOBIE - Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SOBIE Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background-color: #f9fafb; }
            .button { 
              display: inline-block; 
              background-color: #ef4444; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
              font-weight: bold;
            }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello${firstName ? ` ${firstName}` : ''}!</h2>
              <p>You requested a password reset for your SOBIE Conference account. Click the button below to reset your password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                <strong>Security Notice:</strong>
                <ul>
                  <li>This link will expire in 1 hour</li>
                  <li>If you didn't request this reset, you can safely ignore this email</li>
                  <li>Your password will not be changed until you click the link and set a new one</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>This email was sent to ${email} by the SOBIE Conference Platform.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello${firstName ? ` ${firstName}` : ''}!

You requested a password reset for your SOBIE Conference account. Use this link to reset your password:

${resetUrl}

This link will expire in 1 hour.
If you didn't request this reset, you can safely ignore this email.

SOBIE Conference Platform
      `
    };

    try {
      await this.emailTransporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Test email configuration
  async testEmailConfig() {
    if (!this.emailTransporter) {
      return false;
    }
    
    try {
      await this.emailTransporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }
}

module.exports = new NotificationService();
