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
    const magicLinkUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/magic-login?token=${token}`;
    
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

    const magicLinkUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/magic-login?token=${token}`;
    
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
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${token}`;
    
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
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/reset-password?token=${token}`;
    
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

  // Send custom email (for admin notifications)
  async sendCustomEmail(email, subject, message, options = {}) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
    }

    const { name, priority = 'normal', replyTo } = options;

    // Set priority headers
    const headers = {};
    if (priority === 'high') {
      headers['X-Priority'] = '1';
      headers['X-MSMail-Priority'] = 'High';
      headers['Importance'] = 'high';
    } else if (priority === 'low') {
      headers['X-Priority'] = '5';
      headers['X-MSMail-Priority'] = 'Low';
      headers['Importance'] = 'low';
    }

    const mailOptions = {
      from: `"SOBIE Conference" <${process.env.FROM_EMAIL || 'noreply@sobie.org'}>`,
      to: email,
      subject: subject,
      replyTo: replyTo || process.env.FROM_EMAIL || 'noreply@sobie.org',
      headers,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SOBIE Conference</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #007cba; }
            .header h1 { color: #007cba; margin: 0; font-size: 24px; }
            .content { color: #333; font-size: 16px; white-space: pre-line; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px; }
            .priority-high { border-left: 4px solid #dc3545; padding-left: 15px; }
            .priority-low { border-left: 4px solid #6c757d; padding-left: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SOBIE Conference</h1>
            </div>
            <div class="content ${priority === 'high' ? 'priority-high' : priority === 'low' ? 'priority-low' : ''}">
              ${name ? `<p>Dear ${name},</p>` : ''}
              ${message}
            </div>
            <div class="footer">
              <p>This message was sent by the SOBIE Conference administration.</p>
              <p>If you have questions, please contact us at ${replyTo || process.env.FROM_EMAIL || 'info@sobie.org'}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `${name ? `Dear ${name},\n\n` : ''}${message}\n\n---\nSOBIE Conference\n${replyTo || process.env.FROM_EMAIL || 'info@sobie.org'}`
    };

    try {
      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log(`Custom email sent to ${email}:`, result.messageId);
      return result;
    } catch (error) {
      console.error(`Failed to send custom email to ${email}:`, error);
      throw error;
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

  // ============== PROCEEDINGS NOTIFICATION METHODS ==============

  // Send proceedings invitation email
  async sendProceedingsInvitation(recipientEmail, data) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
    }

    const { authorName, paperTitle, submissionNumber, deadline, customMessage } = data;
    
    const deadlineText = deadline ? 
      `<p><strong>Response Deadline:</strong> ${deadline.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>` : '';
    
    const customMessageText = customMessage ? 
      `<div style="background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h4>Special Message from Conference Organizers:</h4>
        <p>${customMessage}</p>
      </div>` : '';
    
    const mailOptions = {
      from: `"SOBIE Conference" <${process.env.FROM_EMAIL || 'noreply@sobie.org'}>`,
      to: recipientEmail,
      subject: `Proceedings Invitation - ${paperTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Proceedings Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 5px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .alert-info { background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>SOBIE Conference Proceedings</h2>
            </div>
            <div class="content">
              <h3>Invitation to Submit to Conference Proceedings</h3>
              <p>Dear ${authorName},</p>
              
              <p>Congratulations on your successful presentation at the SOBIE Conference! We would like to invite you to submit a refined version of your research for publication in the official conference proceedings.</p>
              
              <div class="alert-info">
                <p><strong>Paper Title:</strong> ${paperTitle}</p>
                <p><strong>Submission Number:</strong> ${submissionNumber}</p>
                ${deadlineText}
              </div>
              
              ${customMessageText}
              
              <p>This is an opportunity to:</p>
              <ul>
                <li>Refine your research based on conference feedback</li>
                <li>Reach a broader academic audience through publication</li>
                <li>Enhance your academic profile and citation potential</li>
                <li>Contribute to the lasting impact of the SOBIE Conference</li>
              </ul>
              
              <p>To respond to this invitation, please log into your SOBIE account and navigate to your submissions dashboard.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard/proceedings" class="button">View Proceedings Invitation</a>
              </div>
              
              <p>If you choose to participate, you will be able to upload your refined paper after accepting this invitation.</p>
              
              <p>Thank you for your participation in the conference, and we look forward to your contribution to the proceedings.</p>
              
              <p>Best regards,<br>
              SOBIE Conference Organizing Committee</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the SOBIE Conference Management System.</p>
              <p>Please do not reply to this email. For questions, contact the conference organizers.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Proceedings invitation sent to ${recipientEmail}`);
    } catch (error) {
      console.error(`Failed to send proceedings invitation to ${recipientEmail}:`, error);
      throw error;
    }
  }

  // Send proceedings response notification to admin
  async sendProceedingsResponse(adminEmail, data) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
    }

    const { paperTitle, submissionNumber, authorName, accepted, comments } = data;
    
    const responseStatus = accepted ? 'ACCEPTED' : 'DECLINED';
    const statusColor = accepted ? '#d1ecf1' : '#fff3cd';
    
    const commentsText = comments ? 
      `<p><strong>Author Comments:</strong></p>
       <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
         ${comments}
       </div>` : '';
    
    const mailOptions = {
      from: `"SOBIE Conference" <${process.env.FROM_EMAIL || 'noreply@sobie.org'}>`,
      to: adminEmail,
      subject: `Proceedings Response ${responseStatus} - ${submissionNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Proceedings Response</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 5px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>SOBIE Conference Proceedings</h2>
            </div>
            <div class="content">
              <h3>Proceedings Invitation Response Received</h3>
              
              <div style="background-color: ${statusColor}; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h4>Response: ${responseStatus}</h4>
              </div>
              
              <p><strong>Paper Details:</strong></p>
              <ul>
                <li><strong>Title:</strong> ${paperTitle}</li>
                <li><strong>Submission Number:</strong> ${submissionNumber}</li>
                <li><strong>Author:</strong> ${authorName}</li>
                <li><strong>Response:</strong> ${accepted ? 'Accepted invitation' : 'Declined invitation'}</li>
              </ul>
              
              ${commentsText}
              
              <p>You can view full details in the admin proceedings dashboard.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/admin/proceedings" class="button">View Proceedings Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated message from the SOBIE Conference Management System.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Proceedings response notification sent to admin`);
    } catch (error) {
      console.error(`Failed to send proceedings response notification:`, error);
      throw error;
    }
  }

  // Send proceedings submission notification
  async sendProceedingsSubmission(adminEmail, data) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
    }

    const { paperTitle, submissionNumber, authorName, submittedAt } = data;
    
    const mailOptions = {
      from: `"SOBIE Conference" <${process.env.FROM_EMAIL || 'noreply@sobie.org'}>`,
      to: adminEmail,
      subject: `New Proceedings Submission - ${submissionNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Proceedings Submission</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 5px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .alert-info { background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>SOBIE Conference Proceedings</h2>
            </div>
            <div class="content">
              <h3>New Proceedings Paper Submitted</h3>
              
              <div class="alert-info">
                <h4>Submission Received</h4>
              </div>
              
              <p><strong>Paper Details:</strong></p>
              <ul>
                <li><strong>Title:</strong> ${paperTitle}</li>
                <li><strong>Submission Number:</strong> ${submissionNumber}</li>
                <li><strong>Author:</strong> ${authorName}</li>
                <li><strong>Submitted:</strong> ${submittedAt.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</li>
              </ul>
              
              <p>The paper is now ready for review assignment and processing.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/admin/proceedings" class="button">View Proceedings Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated message from the SOBIE Conference Management System.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Proceedings submission notification sent to admin`);
    } catch (error) {
      console.error(`Failed to send proceedings submission notification:`, error);
      throw error;
    }
  }

  // Send editor assignment notification
  async sendProceedingsEditorAssignment(editorEmail, data) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
    }

    const { editorName, paperTitle, submissionNumber } = data;
    
    const mailOptions = {
      from: `"SOBIE Conference" <${process.env.FROM_EMAIL || 'noreply@sobie.org'}>`,
      to: editorEmail,
      subject: `Proceedings Review Assignment - ${submissionNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Editorial Assignment</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 5px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .alert-info { background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>SOBIE Conference Proceedings</h2>
            </div>
            <div class="content">
              <h3>Proceedings Review Assignment</h3>
              
              <p>Dear ${editorName},</p>
              
              <p>You have been assigned to review a proceedings paper submission.</p>
              
              <div class="alert-info">
                <p><strong>Paper Title:</strong> ${paperTitle}</p>
                <p><strong>Submission Number:</strong> ${submissionNumber}</p>
              </div>
              
              <p>Please log into the editorial system to access the paper and begin your review.</p>
              
              <p><strong>Your responsibilities include:</strong></p>
              <ul>
                <li>Reviewing the paper for quality and conference standards</li>
                <li>Providing constructive feedback to authors</li>
                <li>Making a recommendation for acceptance, revision, or rejection</li>
                <li>Completing the review within the assigned timeframe</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/editor/proceedings" class="button">Access Editorial System</a>
              </div>
              
              <p>Thank you for your service to the SOBIE Conference proceedings.</p>
              
              <p>Best regards,<br>
              SOBIE Conference Editorial Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the SOBIE Conference Management System.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Editor assignment notification sent to ${editorEmail}`);
    } catch (error) {
      console.error(`Failed to send editor assignment notification to ${editorEmail}:`, error);
      throw error;
    }
  }

  // Send acceptance notification
  async sendAcceptanceNotification(authorEmail, data) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
    }

    const { authorName, paperTitle, submissionNumber, publicationDate } = data;
    
    const publicationText = publicationDate ? 
      `<p><strong>Expected Publication Date:</strong> ${publicationDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>` : '';
    
    const mailOptions = {
      from: `"SOBIE Conference" <${process.env.FROM_EMAIL || 'noreply@sobie.org'}>`,
      to: authorEmail,
      subject: `Paper Accepted - ${paperTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Paper Accepted</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 5px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .alert-info { background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>SOBIE Conference Proceedings</h2>
            </div>
            <div class="content">
              <h3>Proceedings Paper Accepted!</h3>
              
              <p>Dear ${authorName},</p>
              
              <p>Congratulations! We are pleased to inform you that your paper has been accepted for publication in the SOBIE Conference Proceedings.</p>
              
              <div class="alert-info">
                <p><strong>Paper Title:</strong> ${paperTitle}</p>
                <p><strong>Submission Number:</strong> ${submissionNumber}</p>
                ${publicationText}
              </div>
              
              <p>Your paper will be included in the official conference proceedings and will be available through our digital publication platform.</p>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Final publication processing will begin shortly</li>
                <li>You will receive publication details and access information</li>
                <li>Your paper will be indexed and made available for citation</li>
              </ul>
              
              <p>Thank you for your valuable contribution to the SOBIE Conference proceedings.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/dashboard/proceedings" class="button">View Publication Status</a>
              </div>
              
              <p>Best regards,<br>
              SOBIE Conference Editorial Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the SOBIE Conference Management System.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Acceptance notification sent to ${authorEmail}`);
    } catch (error) {
      console.error(`Failed to send acceptance notification to ${authorEmail}:`, error);
      throw error;
    }
  }

  // Send publication notification
  async sendPublicationNotification(authorEmail, data) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
    }

    const { authorName, paperTitle, submissionNumber, publicationUrl, doi } = data;
    
    const doiText = doi ? `<p><strong>DOI:</strong> ${doi}</p>` : '';
    
    const mailOptions = {
      from: `"SOBIE Conference" <${process.env.FROM_EMAIL || 'noreply@sobie.org'}>`,
      to: authorEmail,
      subject: `Published: ${paperTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Paper Published</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; }
            .content { padding: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 5px; }
            .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .alert-info { background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>SOBIE Conference Proceedings</h2>
            </div>
            <div class="content">
              <h3>Your Paper is Now Published!</h3>
              
              <p>Dear ${authorName},</p>
              
              <p>We are excited to inform you that your paper has been officially published in the SOBIE Conference Proceedings.</p>
              
              <div class="alert-info">
                <p><strong>Paper Title:</strong> ${paperTitle}</p>
                <p><strong>Submission Number:</strong> ${submissionNumber}</p>
                ${doiText}
              </div>
              
              <p>Your paper is now available online and ready for academic citation and reference.</p>
              
              <div style="text-align: center;">
                <a href="${publicationUrl}" class="button">View Published Paper</a>
              </div>
              
              <p><strong>Publication Benefits:</strong></p>
              <ul>
                <li>Permanent digital archive with DOI assignment</li>
                <li>Academic indexing and search visibility</li>
                <li>Professional citation formatting</li>
                <li>Long-term accessibility and preservation</li>
              </ul>
              
              <p>Congratulations on this achievement, and thank you for contributing to the SOBIE Conference proceedings!</p>
              
              <p>Best regards,<br>
              SOBIE Conference Publishing Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the SOBIE Conference Management System.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    try {
      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Publication notification sent to ${authorEmail}`);
    } catch (error) {
      console.error(`Failed to send publication notification to ${authorEmail}:`, error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
