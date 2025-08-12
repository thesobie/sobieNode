// Email and Notification Safety Configuration for Development/Testing
// This file ensures NO real emails or notifications are sent during development

const DEVELOPMENT_MODE = process.env.NODE_ENV !== 'production';
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';

// Whitelist of allowed test email addresses
const ALLOWED_TEST_EMAILS = [
  'test@example.com',
  'developer@test.com',
  'admin@test.local',
  'sobie@test.dev',
  // Add specific test emails here
  process.env.TEST_USER_EMAIL
].filter(Boolean); // Remove any undefined values

/**
 * Email Safety Guard - Prevents real emails from being sent in development
 * @param {string} toEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} content - Email content
 * @returns {Object} - Safe email configuration or blocked notification
 */
const emailSafetyGuard = (toEmail, subject, content) => {
  console.log(`📧 EMAIL SAFETY CHECK - Mode: ${DEVELOPMENT_MODE ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  console.log(`   To: ${toEmail}`);
  console.log(`   Subject: ${subject}`);
  
  if (DEVELOPMENT_MODE) {
    // In development, only allow emails to test addresses
    if (!ALLOWED_TEST_EMAILS.includes(toEmail)) {
      console.log(`🚫 EMAIL BLOCKED - Development mode, non-test email: ${toEmail}`);
      console.log(`   ✅ Email would be redirected to: ${TEST_EMAIL}`);
      
      return {
        blocked: true,
        originalRecipient: toEmail,
        redirectedTo: TEST_EMAIL,
        safeEmail: {
          to: TEST_EMAIL,
          subject: `[DEV-REDIRECT] ${subject}`,
          content: `
=== DEVELOPMENT EMAIL REDIRECT ===
Original Recipient: ${toEmail}
Redirected To: ${TEST_EMAIL}
Environment: ${process.env.NODE_ENV || 'development'}

Original Message:
${content}

=== END REDIRECT INFO ===
          `
        }
      };
    } else {
      console.log(`✅ EMAIL ALLOWED - Test email: ${toEmail}`);
      return {
        blocked: false,
        safeEmail: {
          to: toEmail,
          subject: `[TEST] ${subject}`,
          content: content
        }
      };
    }
  } else {
    // In production, allow all emails (but log them)
    console.log(`✅ EMAIL ALLOWED - Production mode: ${toEmail}`);
    return {
      blocked: false,
      safeEmail: {
        to: toEmail,
        subject: subject,
        content: content
      }
    };
  }
};

/**
 * SMS/Text Safety Guard - Prevents real SMS from being sent in development
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Object} - Safe SMS configuration or blocked notification
 */
const smsSafetyGuard = (phoneNumber, message) => {
  console.log(`📱 SMS SAFETY CHECK - Mode: ${DEVELOPMENT_MODE ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  console.log(`   To: ${phoneNumber}`);
  console.log(`   Message: ${message.substring(0, 50)}...`);
  
  if (DEVELOPMENT_MODE) {
    console.log(`🚫 SMS BLOCKED - Development mode, SMS to: ${phoneNumber}`);
    console.log(`   ✅ SMS would be logged instead of sent`);
    
    return {
      blocked: true,
      originalRecipient: phoneNumber,
      loggedMessage: `[DEV-SMS-BLOCKED] To: ${phoneNumber} - Message: ${message}`
    };
  } else {
    console.log(`✅ SMS ALLOWED - Production mode: ${phoneNumber}`);
    return {
      blocked: false,
      safeSMS: {
        to: phoneNumber,
        message: message
      }
    };
  }
};

/**
 * Push Notification Safety Guard
 * @param {string} userId - User ID for push notification
 * @param {Object} notification - Notification object
 * @returns {Object} - Safe notification configuration
 */
const pushNotificationSafetyGuard = (userId, notification) => {
  console.log(`🔔 PUSH NOTIFICATION SAFETY CHECK - Mode: ${DEVELOPMENT_MODE ? 'DEVELOPMENT' : 'PRODUCTION'}`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Notification: ${notification.title}`);
  
  if (DEVELOPMENT_MODE) {
    console.log(`🚫 PUSH NOTIFICATION BLOCKED - Development mode`);
    return {
      blocked: true,
      originalUserId: userId,
      loggedNotification: `[DEV-PUSH-BLOCKED] User: ${userId} - ${notification.title}: ${notification.body}`
    };
  } else {
    console.log(`✅ PUSH NOTIFICATION ALLOWED - Production mode`);
    return {
      blocked: false,
      safeNotification: notification
    };
  }
};

/**
 * Safe Email Sender - Wrapper for any email sending function
 * @param {Function} emailSender - Original email sending function
 * @param {string} toEmail - Recipient email
 * @param {string} subject - Email subject
 * @param {string} content - Email content
 * @param {Object} options - Additional email options
 */
const safeEmailSender = async (emailSender, toEmail, subject, content, options = {}) => {
  const safetyCheck = emailSafetyGuard(toEmail, subject, content);
  
  if (safetyCheck.blocked) {
    // Log the blocked email instead of sending
    console.log(`📝 LOGGING BLOCKED EMAIL:`);
    console.log(`   Original To: ${safetyCheck.originalRecipient}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Content Length: ${content.length} characters`);
    
    // Optionally send to test email in development
    if (process.env.SEND_TO_TEST_EMAIL === 'true') {
      console.log(`📧 Sending redirected email to: ${safetyCheck.redirectedTo}`);
      return await emailSender(
        safetyCheck.safeEmail.to,
        safetyCheck.safeEmail.subject,
        safetyCheck.safeEmail.content,
        options
      );
    }
    
    return {
      success: true,
      blocked: true,
      message: 'Email blocked in development mode',
      originalRecipient: safetyCheck.originalRecipient
    };
  } else {
    // Send the email safely
    return await emailSender(
      safetyCheck.safeEmail.to,
      safetyCheck.safeEmail.subject,
      safetyCheck.safeEmail.content,
      options
    );
  }
};

/**
 * Development Safety Logger - Logs all communication attempts
 * @param {string} type - Type of communication (email, sms, push)
 * @param {Object} details - Communication details
 */
const logCommunicationAttempt = (type, details) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    environment: process.env.NODE_ENV || 'development',
    blocked: DEVELOPMENT_MODE,
    details
  };
  
  console.log(`📋 COMMUNICATION LOG:`, JSON.stringify(logEntry, null, 2));
  
  // In a real implementation, you might want to write this to a log file
  // or database for audit purposes
};

module.exports = {
  emailSafetyGuard,
  smsSafetyGuard,
  pushNotificationSafetyGuard,
  safeEmailSender,
  logCommunicationAttempt,
  DEVELOPMENT_MODE,
  TEST_EMAIL,
  ALLOWED_TEST_EMAILS
};
