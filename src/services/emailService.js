const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const { 
  emailSafetyGuard, 
  safeEmailSender, 
  logCommunicationAttempt,
  DEVELOPMENT_MODE 
} = require('../utils/communicationSafety');

/**
 * Safe Email Service - Prevents real emails in development
 */
class SafeEmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (process.env.EMAIL_SERVICE_ENABLED === 'true' && !DEVELOPMENT_MODE) {
      // Real email service configuration for production
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      logger.info('Email service initialized for production', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER ? 'configured' : 'missing'
      });
    } else {
      // Mock transporter for development
      this.transporter = {
        sendMail: async (mailOptions) => {
          logger.info('Mock email service - development mode', {
            to: mailOptions.to,
            subject: mailOptions.subject,
            contentLength: mailOptions.html?.length || mailOptions.text?.length || 0,
            type: 'mock_email'
          });
          return {
            messageId: 'mock-dev-' + Date.now(),
            response: 'Mock email - development mode'
          };
        }
      };
      logger.info('Email service initialized for development (mock mode)');
    }
  }

  /**
   * Send welcome email to new users
   * @param {Object} user - User object
   */
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to SOBIE Research Database';
    const content = `
      <h2>Welcome to SOBIE Research Database!</h2>
      <p>Dear ${user.name?.firstName || 'User'},</p>
      <p>Your account has been created successfully.</p>
      <p>Email: ${user.email}</p>
      <p>Institution: ${user.affiliation?.organization || 'Not specified'}</p>
      <p>Best regards,<br>SOBIE Team</p>
    `;

    return await this.sendSafeEmail(user.email, subject, content, 'welcome');
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} resetToken - Password reset token
   */
  async sendPasswordResetEmail(user, resetToken) {
    const subject = 'Password Reset - SOBIE Research Database';
    const content = `
      <h2>Password Reset Request</h2>
      <p>Dear ${user.name?.firstName || 'User'},</p>
      <p>You have requested a password reset.</p>
      <p>Reset token: ${resetToken}</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Best regards,<br>SOBIE Team</p>
    `;

    return await this.sendSafeEmail(user.email, subject, content, 'password_reset');
  }

  /**
   * Send presentation submission confirmation
   * @param {Object} user - User object
   * @param {Object} presentation - Presentation object
   */
  async sendPresentationConfirmation(user, presentation) {
    const subject = 'Presentation Submission Confirmed - SOBIE 2025';
    const content = `
      <h2>Presentation Submission Confirmed</h2>
      <p>Dear ${user.name?.firstName || 'User'},</p>
      <p>Your presentation has been successfully submitted:</p>
      <p><strong>Title:</strong> ${presentation.title}</p>
      <p><strong>Session:</strong> ${presentation.sessionTitle || 'TBD'}</p>
      <p>Thank you for your contribution to SOBIE 2025!</p>
      <p>Best regards,<br>SOBIE Team</p>
    `;

    return await this.sendSafeEmail(user.email, subject, content, 'presentation_confirmation');
  }

  /**
   * Send notification about research linking
   * @param {Object} user - User object
   * @param {Array} presentations - Array of linked presentations
   */
  async sendResearchLinkingNotification(user, presentations) {
    const subject = 'Your Research Has Been Added - SOBIE Database';
    const content = `
      <h2>Research Profile Updated</h2>
      <p>Dear ${user.name?.firstName || 'User'},</p>
      <p>We have linked ${presentations.length} presentation(s) to your profile:</p>
      <ul>
        ${presentations.map(p => `<li>${p.title}</li>`).join('')}
      </ul>
      <p>You can view your complete research profile in the SOBIE database.</p>
      <p>Best regards,<br>SOBIE Team</p>
    `;

    return await this.sendSafeEmail(user.email, subject, content, 'research_linking');
  }

  /**
   * Send conference registration confirmation email
   * @param {Object} registration - Conference registration object
   */
  async sendRegistrationConfirmation(registration) {
    const conferenceName = registration.conference.name;
    const confirmationCode = registration.confirmation.code;
    const confirmationToken = registration.confirmation.confirmationToken;
    const userName = registration.fullName;
    const userEmail = registration.registrationInfo.personalInfo.email;
    
    const confirmationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/conference/confirm?token=${confirmationToken}`;
    
    const subject = `Conference Registration - Confirmation Required for ${conferenceName}`;
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to ${conferenceName}!</h2>
        <p>Dear ${userName},</p>
        
        <p>Thank you for registering for ${conferenceName}! To complete your registration, please confirm your email address.</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Confirmation Required</h3>
          <p><strong>Confirmation Code:</strong> <span style="font-size: 18px; font-weight: bold; color: #dc2626;">${confirmationCode}</span></p>
          <p>Or click the button below to confirm automatically:</p>
          <a href="${confirmationUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Confirm Registration</a>
        </div>
        
        <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #059669;">Conference Details</h4>
          <p><strong>Conference:</strong> ${conferenceName}</p>
          <p><strong>Dates:</strong> ${new Date(registration.conference.startDate).toLocaleDateString()} - ${new Date(registration.conference.endDate).toLocaleDateString()}</p>
          <p><strong>Location:</strong> ${registration.conference.location.venue}, ${registration.conference.location.city}, ${registration.conference.location.state}</p>
          <p><strong>Registration Deadline:</strong> ${new Date(registration.conference.registrationDeadline).toLocaleDateString()}</p>
        </div>
        
        <div style="background: #fff7ed; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #ea580c;">Next Steps</h4>
          <ol>
            <li>Confirm your registration using the code above or clicking the button</li>
            <li>Once confirmed, you can optionally submit research presentations</li>
            <li>Watch for conference updates and details via email</li>
            <li>Download the conference app when available</li>
          </ol>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          <strong>Need Help?</strong> Contact us at <a href="mailto:support@sobie.org">support@sobie.org</a><br>
          This confirmation link expires in 7 days.
        </p>
        
        <p>Best regards,<br>The SOBIE Team</p>
      </div>
    `;

    return await this.sendSafeEmail(userEmail, subject, content, 'conference_registration_confirmation');
  }

  /**
   * Send registration confirmed email
   * @param {Object} registration - Conference registration object
   */
  async sendRegistrationConfirmed(registration) {
    const conferenceName = registration.conference.name;
    const userName = registration.fullName;
    const userEmail = registration.registrationInfo.personalInfo.email;
    
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`;
    
    const subject = `Registration Confirmed - Welcome to ${conferenceName}!`;
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">🎉 Registration Confirmed!</h2>
        <p>Dear ${userName},</p>
        
        <p>Congratulations! Your registration for ${conferenceName} has been confirmed. We're excited to have you join us!</p>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <h3 style="margin-top: 0; color: #059669;">You're All Set!</h3>
          <p><strong>Conference:</strong> ${conferenceName}</p>
          <p><strong>Dates:</strong> ${new Date(registration.conference.startDate).toLocaleDateString()} - ${new Date(registration.conference.endDate).toLocaleDateString()}</p>
          <p><strong>Location:</strong> ${registration.conference.location.venue}, ${registration.conference.location.city}</p>
          <p><strong>Attendance Type:</strong> ${registration.preferences.attendanceType?.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Confirmed:</strong> ${new Date(registration.confirmation.confirmedAt).toLocaleDateString()}</p>
        </div>
        
        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #0284c7;">Optional: Submit Research</h4>
          <p>Now that you're registered, you can optionally submit research presentations for consideration.</p>
          <a href="${dashboardUrl}" style="display: inline-block; background: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Visit Your Dashboard</a>
        </div>
        
        <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #d97706;">What's Next?</h4>
          <ul>
            <li>Watch for pre-conference materials and schedules</li>
            <li>Connect with other attendees through our networking platform</li>
            <li><strong>📧 Check your email for San Destin Resort information and discount codes</strong></li>
            <li>Submit research presentations (optional)</li>
            <li>Download the conference mobile app when available</li>
          </ul>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h4 style="margin-top: 0; color: #d97706;">🏖️ Accommodation at Sandestin Resort</h4>
          <p>SOBIE ${new Date(registration.conference.startDate).getFullYear()} will be held at the beautiful <strong>Sandestin Golf and Beach Resort</strong> in Miramar Beach, Florida.</p>
          <p><strong>Special Benefits for Attendees:</strong></p>
          <ul>
            <li>🎟️ Exclusive group rate discount codes</li>
            <li>🏨 Multiple accommodation options (hotel, condos, vacation rentals)</li>
            <li>🌊 Full resort amenities including beach access and golf</li>
            <li>🚌 Convenient shuttle service within the resort</li>
          </ul>
          <p><strong>Resort booking information with your discount codes will be sent in a separate email shortly.</strong></p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          <strong>Questions?</strong> Contact us at <a href="mailto:support@sobie.org">support@sobie.org</a><br>
          Visit your <a href="${dashboardUrl}">dashboard</a> to view your registration details.
        </p>
        
        <p>Looking forward to seeing you at the conference!</p>
        <p>Best regards,<br>The SOBIE Team</p>
      </div>
    `;

    return await this.sendSafeEmail(userEmail, subject, content, 'conference_registration_confirmed');
  }

  /**
   * Send registration cancelled email
   * @param {Object} registration - Conference registration object
   * @param {string} reason - Cancellation reason
   */
  async sendRegistrationCancelled(registration, reason = '') {
    const conferenceName = registration.conference.name;
    const userName = registration.fullName;
    const userEmail = registration.registrationInfo.personalInfo.email;
    
    const subject = `Registration Cancelled - ${conferenceName}`;
    const content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Registration Cancelled</h2>
        <p>Dear ${userName},</p>
        
        <p>Your registration for ${conferenceName} has been cancelled as requested.</p>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h4 style="margin-top: 0; color: #dc2626;">Cancellation Details</h4>
          <p><strong>Conference:</strong> ${conferenceName}</p>
          <p><strong>Cancelled:</strong> ${new Date().toLocaleDateString()}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        
        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #0284c7;">Want to Register Again?</h4>
          <p>You can register again at any time before the registration deadline if you change your mind.</p>
          <p>Registration deadline: ${new Date(registration.conference.registrationDeadline).toLocaleDateString()}</p>
        </div>
        
        <p>We're sorry to see you go and hope you'll consider joining us for future SOBIE conferences.</p>
        
        <p style="color: #6b7280; font-size: 14px;">
          <strong>Questions?</strong> Contact us at <a href="mailto:support@sobie.org">support@sobie.org</a>
        </p>
        
        <p>Best regards,<br>The SOBIE Team</p>
      </div>
    `;

    return await this.sendSafeEmail(userEmail, subject, content, 'conference_registration_cancelled');
  }

  /**
   * Core safe email sending method
   * @param {string} toEmail - Recipient email
   * @param {string} subject - Email subject
   * @param {string} htmlContent - Email HTML content
   * @param {string} emailType - Type of email for logging
   */
  async sendSafeEmail(toEmail, subject, htmlContent, emailType = 'general') {
    try {
      // Log the communication attempt
      logCommunicationAttempt('email', {
        to: toEmail,
        subject: subject,
        type: emailType,
        contentLength: htmlContent.length
      });

      // Use the safety guard
      const safetyCheck = emailSafetyGuard(toEmail, subject, htmlContent);

      if (safetyCheck.blocked) {
        logger.info('Email blocked in development mode', {
          emailType,
          recipient: toEmail,
          subject: subject,
          blocked: true,
          reason: 'development_safety_guard'
        });
        
        // In development, optionally log to file or console
        if (process.env.LOG_COMMUNICATION_ATTEMPTS === 'true') {
          logger.debug('Email content logging enabled', {
            recipient: toEmail,
            emailType
          });
        }

        return {
          success: true,
          blocked: true,
          message: `Email blocked in development mode`,
          originalRecipient: toEmail,
          emailType: emailType
        };
      }

      // Send the email safely
      const mailOptions = {
        from: process.env.SMTP_USER || 'noreply@sobie.dev',
        to: safetyCheck.safeEmail.to,
        subject: safetyCheck.safeEmail.subject,
        html: safetyCheck.safeEmail.content
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        emailType,
        recipient: safetyCheck.safeEmail.to,
        subject: safetyCheck.safeEmail.subject,
        messageId: result.messageId
      });

      return {
        success: true,
        blocked: false,
        messageId: result.messageId,
        recipient: safetyCheck.safeEmail.to,
        emailType: emailType
      };

    } catch (error) {
      logger.error('Email sending failed', {
        emailType,
        recipient: toEmail,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: error.message,
        recipient: toEmail,
        emailType: emailType
      };
    }
  }

  /**
   * Test email functionality with safety checks
   */
  async testEmailService() {
    logger.info('Testing email service', {
      environment: process.env.NODE_ENV || 'development',
      developmentMode: DEVELOPMENT_MODE,
      testEmail: process.env.TEST_USER_EMAIL,
      service: 'email_test'
    });

    const testResult = await this.sendSafeEmail(
      process.env.TEST_USER_EMAIL || 'test@example.com',
      'Email Service Test',
      '<p>This is a test email to verify the safety system is working.</p>',
      'test'
    );

    logger.info('Email service test completed', {
      testResult,
      service: 'email_test'
    });
    return testResult;
  }

  /**
   * Send research submission confirmation email
   * @param {string} email - Author's email
   * @param {Object} submissionData - Submission details
   */
  async sendResearchSubmissionConfirmation(email, submissionData) {
    const { authorName, title, submissionNumber, conferenceName, conferenceYear } = submissionData;

    return await this.sendSafeEmail(
      email,
      `Research Submission Received - ${submissionNumber}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .highlight { background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Research Submission Confirmed</h1>
            </div>
            <div class="content">
              <p>Dear ${authorName},</p>
              
              <p>Thank you for submitting your research to the ${conferenceName} ${conferenceYear}. We have successfully received your submission.</p>
              
              <div class="highlight">
                <strong>Submission Details:</strong><br>
                <strong>Title:</strong> ${title}<br>
                <strong>Submission Number:</strong> ${submissionNumber}<br>
                <strong>Conference:</strong> ${conferenceName} ${conferenceYear}
              </div>
              
              <p><strong>What happens next:</strong></p>
              <ol>
                <li>Your submission will be assigned to an editor</li>
                <li>The editor will assign qualified reviewers</li>
                <li>You will receive email updates throughout the review process</li>
                <li>The final decision will be communicated within 6-8 weeks</li>
              </ol>
              
              <p>You can track the status of your submission by logging into your SOBIE profile.</p>
              
              <p>Thank you for your contribution to the SOBIE community!</p>
            </div>
            <div class="footer">
              <p>SOBIE Conference Research Review System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'research_submission_confirmation'
    );
  }

  /**
   * Send new submission notification to editors
   */
  async sendNewSubmissionNotification(email, submissionData) {
    const { title, authorName, submissionNumber, discipline, submissionDate } = submissionData;

    return await this.sendSafeEmail(
      email,
      `New Research Submission - ${discipline} - ${submissionNumber}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
            .submission-box { background-color: white; border: 1px solid #d1d5db; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Research Submission</h1>
            </div>
            <div class="content">
              <p>A new research submission has been received and is awaiting editor assignment.</p>
              
              <div class="submission-box">
                <h3>${title}</h3>
                <p><strong>Author(s):</strong> ${authorName}</p>
                <p><strong>Submission Number:</strong> ${submissionNumber}</p>
                <p><strong>Discipline:</strong> ${discipline}</p>
                <p><strong>Submitted:</strong> ${new Date(submissionDate).toLocaleDateString()}</p>
              </div>
              
              <p>Please log into the admin dashboard to review and assign an editor to this submission.</p>
            </div>
            <div class="footer">
              <p>SOBIE Conference Research Review System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'new_submission_notification'
    );
  }

  /**
   * Send editor assignment notification
   */
  async sendEditorAssignmentNotification(email, assignmentData) {
    const { editorName, title, authorName, submissionNumber, discipline, abstractPreview } = assignmentData;

    return await this.sendSafeEmail(
      email,
      `Editor Assignment - ${submissionNumber}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #faf5ff; padding: 30px; border-radius: 0 0 8px 8px; }
            .submission-box { background-color: white; border: 1px solid #d1d5db; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .abstract { background-color: #f3f4f6; padding: 15px; border-radius: 6px; font-style: italic; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You've Been Assigned as Editor</h1>
            </div>
            <div class="content">
              <p>Dear ${editorName},</p>
              
              <p>You have been assigned as the editor for a new research submission. Please review the submission details below and assign qualified reviewers.</p>
              
              <div class="submission-box">
                <h3>${title}</h3>
                <p><strong>Author(s):</strong> ${authorName}</p>
                <p><strong>Submission Number:</strong> ${submissionNumber}</p>
                <p><strong>Discipline:</strong> ${discipline}</p>
                
                <div class="abstract">
                  <strong>Abstract Preview:</strong><br>
                  ${abstractPreview}
                </div>
              </div>
              
              <p><strong>Your responsibilities as editor:</strong></p>
              <ul>
                <li>Review the submission for completeness and scope fit</li>
                <li>Assign 2-3 qualified reviewers (avoid conflicts of interest)</li>
                <li>Monitor the review process and send reminders if needed</li>
                <li>Make the final decision based on reviewer recommendations</li>
              </ul>
              
              <p>Please log into the system to begin the review process.</p>
            </div>
            <div class="footer">
              <p>SOBIE Conference Research Review System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'editor_assignment'
    );
  }

  /**
   * Send editor assigned notification to author
   */
  async sendEditorAssignedNotification(email, notificationData) {
    const { authorName, title, submissionNumber, editorName } = notificationData;

    return await this.sendSafeEmail(
      email,
      `Editor Assigned to Your Submission - ${submissionNumber}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .highlight { background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Editor Assigned</h1>
            </div>
            <div class="content">
              <p>Dear ${authorName},</p>
              
              <p>Great news! An editor has been assigned to review your research submission.</p>
              
              <div class="highlight">
                <strong>Submission:</strong> ${title}<br>
                <strong>Submission Number:</strong> ${submissionNumber}<br>
                <strong>Assigned Editor:</strong> ${editorName}
              </div>
              
              <p>The editor will now assign qualified reviewers to evaluate your work. You will receive email updates as the review progresses.</p>
              
              <p>The typical review timeline is 6-8 weeks from this point.</p>
              
              <p>Thank you for your patience!</p>
            </div>
            <div class="footer">
              <p>SOBIE Conference Research Review System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'editor_assigned_author'
    );
  }

  /**
   * Send review invitation to reviewers
   */
  async sendReviewInvitation(email, invitationData) {
    const { reviewerName, title, authorName, submissionNumber, discipline, deadline, abstractPreview, acceptUrl, declineUrl } = invitationData;

    return await this.sendSafeEmail(
      email,
      `Review Invitation - ${discipline} - ${submissionNumber}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
            .submission-box { background-color: white; border: 1px solid #d1d5db; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .abstract { background-color: #f3f4f6; padding: 15px; border-radius: 6px; font-style: italic; margin-top: 15px; }
            .buttons { text-align: center; margin: 30px 0; }
            .button { display: inline-block; padding: 12px 24px; margin: 0 10px; border-radius: 6px; text-decoration: none; font-weight: bold; }
            .accept { background-color: #10b981; color: white; }
            .decline { background-color: #ef4444; color: white; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Research Review Invitation</h1>
            </div>
            <div class="content">
              <p>Dear ${reviewerName},</p>
              
              <p>You are invited to review a research submission for the SOBIE Conference. Your expertise in this area would be valuable for providing a thorough evaluation.</p>
              
              <div class="submission-box">
                <h3>${title}</h3>
                <p><strong>Author(s):</strong> ${authorName}</p>
                <p><strong>Submission Number:</strong> ${submissionNumber}</p>
                <p><strong>Discipline:</strong> ${discipline}</p>
                <p><strong>Review Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>
                
                <div class="abstract">
                  <strong>Abstract Preview:</strong><br>
                  ${abstractPreview}
                </div>
              </div>
              
              <p><strong>Review expectations:</strong></p>
              <ul>
                <li>Evaluate methodology, originality, and significance</li>
                <li>Provide constructive feedback to authors</li>
                <li>Complete review within the deadline</li>
                <li>Maintain confidentiality of the submission</li>
              </ul>
              
              <div class="buttons">
                <a href="${acceptUrl || '#'}" class="button accept">Accept Review</a>
                <a href="${declineUrl || '#'}" class="button decline">Decline Review</a>
              </div>
              
              <p>Please respond as soon as possible so we can proceed with the review process.</p>
              
              <p>Thank you for your service to the SOBIE community!</p>
            </div>
            <div class="footer">
              <p>SOBIE Conference Research Review System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'review_invitation'
    );
  }

  /**
   * Send reviewers assigned notification to author
   */
  async sendReviewersAssignedNotification(email, notificationData) {
    const { authorName, title, submissionNumber, reviewerCount, deadline } = notificationData;

    return await this.sendSafeEmail(
      email,
      `Reviewers Assigned to Your Submission - ${submissionNumber}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .highlight { background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reviewers Assigned</h1>
            </div>
            <div class="content">
              <p>Dear ${authorName},</p>
              
              <p>Your research submission is now in the review phase. ${reviewerCount} qualified reviewers have been assigned to evaluate your work.</p>
              
              <div class="highlight">
                <strong>Submission:</strong> ${title}<br>
                <strong>Submission Number:</strong> ${submissionNumber}<br>
                <strong>Number of Reviewers:</strong> ${reviewerCount}<br>
                <strong>Review Deadline:</strong> ${new Date(deadline).toLocaleDateString()}
              </div>
              
              <p>The reviewers will evaluate your submission based on:</p>
              <ul>
                <li>Relevance to the conference scope</li>
                <li>Methodology and research design</li>
                <li>Originality and contribution</li>
                <li>Clarity of presentation</li>
                <li>Significance of findings</li>
              </ul>
              
              <p>You will be notified once the reviews are complete and a final decision is made.</p>
              
              <p>You can track the progress of your submission in your SOBIE profile.</p>
            </div>
            <div class="footer">
              <p>SOBIE Conference Research Review System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'reviewers_assigned'
    );
  }

  /**
   * Send review completion notification to editor
   */
  async sendReviewsCompleteNotification(email, notificationData) {
    const { editorName, title, submissionNumber, reviewCount } = notificationData;

    return await this.sendSafeEmail(
      email,
      `All Reviews Complete - ${submissionNumber}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
            .highlight { background-color: #dcfce7; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reviews Complete</h1>
            </div>
            <div class="content">
              <p>Dear ${editorName},</p>
              
              <p>All reviews have been completed for the submission you are editing. Please review the feedback and make your final decision.</p>
              
              <div class="highlight">
                <strong>Submission:</strong> ${title}<br>
                <strong>Submission Number:</strong> ${submissionNumber}<br>
                <strong>Reviews Completed:</strong> ${reviewCount}
              </div>
              
              <p>Please log into the system to:</p>
              <ul>
                <li>Review all reviewer feedback</li>
                <li>Make the final decision (accept, revision, or reject)</li>
                <li>Provide editorial comments to the author</li>
                <li>Send the decision notification</li>
              </ul>
              
              <p>Thank you for your editorial service!</p>
            </div>
            <div class="footer">
              <p>SOBIE Conference Research Review System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'reviews_complete'
    );
  }

  /**
   * Send final decision notification to author
   */
  async sendDecisionNotification(email, decisionData) {
    const { authorName, title, submissionNumber, decision, editorComments, reviews } = decisionData;

    const decisionText = {
      accept: 'Congratulations! Your submission has been ACCEPTED',
      minor_revision: 'Your submission has been ACCEPTED with MINOR REVISIONS',
      major_revision: 'Your submission requires MAJOR REVISIONS',
      reject: 'Unfortunately, your submission has been REJECTED'
    };

    const decisionColor = {
      accept: '#059669',
      minor_revision: '#d97706',
      major_revision: '#dc2626',
      reject: '#7f1d1d'
    };

    return await this.sendSafeEmail(
      email,
      `Decision on Your Submission - ${submissionNumber}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${decisionColor[decision]}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .decision-box { background-color: white; border-left: 4px solid ${decisionColor[decision]}; padding: 20px; margin: 20px 0; }
            .review-summary { background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Research Review Decision</h1>
            </div>
            <div class="content">
              <p>Dear ${authorName},</p>
              
              <div class="decision-box">
                <h2>${decisionText[decision]}</h2>
                <p><strong>Submission:</strong> ${title}</p>
                <p><strong>Submission Number:</strong> ${submissionNumber}</p>
              </div>
              
              ${editorComments ? `
                <h3>Editorial Comments:</h3>
                <div class="review-summary">
                  ${editorComments}
                </div>
              ` : ''}
              
              <h3>Reviewer Feedback:</h3>
              ${reviews.map((review, index) => `
                <div class="review-summary">
                  <strong>Reviewer ${index + 1}:</strong><br>
                  <strong>Overall Score:</strong> ${review.overallScore}/5<br>
                  <strong>Recommendation:</strong> ${review.recommendation}<br>
                  ${review.authorComments ? `<strong>Comments:</strong> ${review.authorComments}` : ''}
                </div>
              `).join('')}
              
              ${decision === 'accept' ? `
                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>You will receive presentation details soon</li>
                  <li>Please confirm your attendance at the conference</li>
                  <li>Prepare your presentation materials</li>
                </ul>
              ` : decision.includes('revision') ? `
                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>Address the reviewer comments</li>
                  <li>Revise your submission accordingly</li>
                  <li>Resubmit within the specified deadline</li>
                </ul>
              ` : `
                <p>While this submission was not accepted, we encourage you to consider the feedback and potentially submit to future conferences.</p>
              `}
              
              <p>Thank you for your contribution to the SOBIE community!</p>
            </div>
            <div class="footer">
              <p>SOBIE Conference Research Review System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'decision_notification'
    );
  }

  /**
   * Send review reminder to reviewers
   */
  async sendReviewReminder(email, reminderData) {
    const { reviewerName, title, submissionNumber, deadline, daysRemaining } = reminderData;

    const urgencyColor = daysRemaining <= 3 ? '#dc2626' : daysRemaining <= 7 ? '#d97706' : '#059669';

    return await this.sendSafeEmail(
      email,
      `Review Reminder - ${submissionNumber} - ${daysRemaining} days remaining`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${urgencyColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .deadline-box { background-color: white; border-left: 4px solid ${urgencyColor}; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Review Reminder</h1>
            </div>
            <div class="content">
              <p>Dear ${reviewerName},</p>
              
              <p>This is a friendly reminder about your pending review assignment.</p>
              
              <div class="deadline-box">
                <h3>${title}</h3>
                <p><strong>Submission Number:</strong> ${submissionNumber}</p>
                <p><strong>Review Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>
                <p><strong>Days Remaining:</strong> ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}</p>
              </div>
              
              ${daysRemaining <= 3 ? `
                <p style="color: #dc2626; font-weight: bold;">⚠️ URGENT: Your review is due very soon!</p>
              ` : ''}
              
              <p>Please log into the system to complete your review. Your feedback is valuable to the authors and the SOBIE community.</p>
              
              <p>If you need an extension or have any issues, please contact the editorial team immediately.</p>
              
              <p>Thank you for your continued service!</p>
            </div>
            <div class="footer">
              <p>SOBIE Conference Research Review System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'review_reminder'
    );
  }

  /**
   * Send resort information email with discount codes
   */
  async sendResortInformationEmail(emailData) {
    const { user, conference, venue, discountCodes, registration } = emailData;

    const discountCodesHtml = discountCodes.map(code => `
      <div class="discount-card" style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 15px 0;">
        <h4 style="margin: 0 0 10px 0; color: #007bff;">${code.code}</h4>
        <p style="margin: 5px 0; font-weight: bold;">${code.description}</p>
        <p style="margin: 5px 0; color: #28a745;">${code.discount}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Valid:</strong> ${new Date(code.validFrom).toLocaleDateString()} - ${new Date(code.validUntil).toLocaleDateString()}</p>
        <div style="margin-top: 10px;">
          <p style="margin: 3px 0; font-size: 13px; color: #6c757d;"><strong>Instructions:</strong> ${code.bookingInstructions}</p>
          ${code.terms.map(term => `<p style="margin: 2px 0; font-size: 12px; color: #6c757d;">• ${term}</p>`).join('')}
        </div>
      </div>
    `).join('');

    const amenitiesHtml = venue.amenities.map(amenity => 
      `<li style="margin: 5px 0;">${amenity}</li>`
    ).join('');

    const accommodationTypesHtml = venue.accommodationTypes.map(type => `
      <div style="margin: 15px 0;">
        <h4 style="margin: 0 0 5px 0; color: #007bff;">${type.type}</h4>
        <p style="margin: 5px 0;">${type.description}</p>
        <ul style="margin: 5px 0; padding-left: 20px;">
          ${type.features.map(feature => `<li style="font-size: 14px;">${feature}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    return await this.sendSafeEmail(
      user.email,
      `SOBIE ${conference.year} - San Destin Resort Information & Discount Codes`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #dee2e6; }
            .venue-info { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .booking-info { background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .urgent { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #dee2e6; padding-top: 20px; }
            .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏖️ SOBIE ${conference.year}</h1>
              <h2>San Destin Resort Information</h2>
            </div>
            <div class="content">
              <p>Dear ${user.name.first} ${user.name.last},</p>
              
              <p>Welcome to SOBIE ${conference.year}! We're excited to have you join us at the beautiful <strong>Sandestin Golf and Beach Resort</strong>.</p>
              
              <div class="urgent">
                <h3>🎟️ Your Exclusive Discount Codes</h3>
                <p>As a confirmed attendee, you have access to special resort rates:</p>
                ${discountCodesHtml}
              </div>
              
              <div class="venue-info">
                <h3>🏨 About Sandestin Golf and Beach Resort</h3>
                <p><strong>Address:</strong> ${venue.location.address}, ${venue.location.city}, ${venue.location.state} ${venue.location.zipCode}</p>
                <p>${venue.description}</p>
                
                <h4>🌟 Resort Amenities</h4>
                <ul>
                  ${amenitiesHtml}
                </ul>
                
                <h4>🏠 Accommodation Options</h4>
                ${accommodationTypesHtml}
              </div>
              
              <div class="booking-info">
                <h3>📞 How to Book</h3>
                <p><strong>Website:</strong> <a href="${venue.bookingInfo.reservationWebsite}">${venue.bookingInfo.reservationWebsite}</a></p>
                <p><strong>Phone:</strong> ${venue.bookingInfo.reservationPhone}</p>
                <p><strong>Group Code:</strong> <span style="background-color: #007bff; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">${venue.bookingInfo.groupCode}</span></p>
                <p><strong>Important:</strong> ${venue.bookingInfo.bookingInstructions}</p>
              </div>
              
              <div class="venue-info">
                <h3>✈️ Transportation Information</h3>
                <p><strong>Airport:</strong> ${venue.transportationInfo.airport}</p>
                <p><strong>Shuttle Service:</strong> ${venue.transportationInfo.shuttleService}</p>
                <p><strong>Parking:</strong> ${venue.transportationInfo.parking}</p>
                <p><strong>Local Transportation:</strong> ${venue.transportationInfo.localTransportation}</p>
              </div>
              
              <div class="venue-info">
                <h3>📅 Conference Venues</h3>
                <ul>
                  ${venue.conferenceVenues.map(venueLocation => `<li>${venueLocation}</li>`).join('')}
                </ul>
              </div>
              
              <div class="urgent">
                <h3>⏰ Important Deadlines</h3>
                <p><strong>Group Rate Deadline:</strong> Book by this date to secure discounted rates</p>
                <p><strong>Cancellation Policy:</strong> Review resort policies before booking</p>
                <p><strong>Conference Dates:</strong> ${new Date(conference.startDate).toLocaleDateString()} - ${new Date(conference.endDate).toLocaleDateString()}</p>
              </div>
              
              <h3>🤔 Accommodation Preference</h3>
              <p>We'd love to know your accommodation plans to help with conference logistics!</p>
              <a href="#" class="button">Update Your Accommodation Preference</a>
              
              <p style="margin-top: 30px;">If you have any questions about the resort or need assistance with booking, please don't hesitate to contact our conference team.</p>
              
              <p>We look forward to seeing you at SOBIE ${conference.year}!</p>
              
              <p>Best regards,<br>
              The SOBIE ${conference.year} Conference Team</p>
            </div>
            <div class="footer">
              <p>SOBIE ${conference.year} Conference | ${venue.name}</p>
              <p>This email was sent to ${user.email} as a confirmed conference attendee.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'resort_information'
    );
  }
}

// Create singleton instance
const emailService = new SafeEmailService();

module.exports = emailService;
