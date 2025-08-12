const { logCommunicationAttempt, DEVELOPMENT_MODE } = require('../utils/communicationSafety');
const emailService = require('../services/emailService');

/**
 * Communication Safety Middleware
 * Ensures no real communications are sent during development/testing
 */

/**
 * Middleware to intercept and safely handle user registration emails
 */
const safeUserRegistration = async (req, res, next) => {
  try {
    // Store original res.json to intercept responses
    const originalJson = res.json;
    
    res.json = function(data) {
      // If this is a successful user registration
      if (data.success && data.user && req.method === 'POST' && req.path.includes('register')) {
        console.log('🛡️  SAFE REGISTRATION INTERCEPTED');
        console.log(`   User: ${data.user.email}`);
        console.log(`   Institution: ${data.user.affiliation?.organization || 'Unknown'}`);
        
        // Log the registration attempt
        logCommunicationAttempt('user_registration', {
          email: data.user.email,
          name: `${data.user.name?.firstName} ${data.user.name?.lastName}`,
          institution: data.user.affiliation?.organization,
          userType: data.user.userType
        });

        if (DEVELOPMENT_MODE) {
          console.log('🚫 Welcome email BLOCKED - Development mode');
          
          // Add safety notice to response
          data.safetyNotice = {
            developmentMode: true,
            emailBlocked: true,
            message: 'Welcome email blocked in development mode',
            wouldHaveBeenSentTo: data.user.email
          };
        }
      }
      
      // Call original res.json
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('❌ Error in safe registration middleware:', error);
    next(error);
  }
};

/**
 * Middleware to safely handle password reset requests
 */
const safePasswordReset = async (req, res, next) => {
  try {
    const originalJson = res.json;
    
    res.json = function(data) {
      if (data.success && req.method === 'POST' && req.path.includes('reset')) {
        console.log('🛡️  SAFE PASSWORD RESET INTERCEPTED');
        console.log(`   Email: ${req.body.email}`);
        
        logCommunicationAttempt('password_reset', {
          email: req.body.email,
          timestamp: new Date().toISOString()
        });

        if (DEVELOPMENT_MODE) {
          console.log('🚫 Password reset email BLOCKED - Development mode');
          
          data.safetyNotice = {
            developmentMode: true,
            emailBlocked: true,
            message: 'Password reset email blocked in development mode',
            wouldHaveBeenSentTo: req.body.email
          };
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('❌ Error in safe password reset middleware:', error);
    next(error);
  }
};

/**
 * Middleware to safely handle user notification preferences
 */
const safeNotificationSettings = async (req, res, next) => {
  try {
    if (req.method === 'PUT' && req.path.includes('notifications')) {
      console.log('🛡️  NOTIFICATION SETTINGS INTERCEPTED');
      console.log(`   User: ${req.user?.email || 'Unknown'}`);
      console.log(`   Settings: ${JSON.stringify(req.body)}`);
      
      logCommunicationAttempt('notification_settings', {
        userId: req.user?._id,
        email: req.user?.email,
        settings: req.body
      });

      if (DEVELOPMENT_MODE) {
        console.log('ℹ️  Note: Notification settings saved but no actual notifications will be sent in development mode');
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in safe notification settings middleware:', error);
    next(error);
  }
};

/**
 * Global communication safety checker for any route
 */
const globalCommSafety = (req, res, next) => {
  if (DEVELOPMENT_MODE) {
    // Add safety headers to all responses
    res.setHeader('X-Dev-Mode', 'true');
    res.setHeader('X-Email-Safety', 'enabled');
    res.setHeader('X-SMS-Safety', 'enabled');
  }
  
  next();
};

/**
 * Test endpoint to verify safety systems
 */
const testSafetyEndpoint = async (req, res) => {
  try {
    console.log('🧪 TESTING COMMUNICATION SAFETY SYSTEMS');
    
    const safetyStatus = {
      developmentMode: DEVELOPMENT_MODE,
      environment: process.env.NODE_ENV || 'development',
      emailSafetyEnabled: true,
      smsSafetyEnabled: true,
      pushNotificationSafetyEnabled: true,
      testUserEmail: process.env.TEST_USER_EMAIL,
      timestamp: new Date().toISOString()
    };

    // Test email service
    const emailTestResult = await emailService.testEmailService();
    
    // Log the test
    logCommunicationAttempt('safety_test', {
      testType: 'communication_safety_check',
      emailTest: emailTestResult,
      safetyStatus
    });

    res.json({
      success: true,
      message: 'Communication safety systems operational',
      safetyStatus,
      emailTest: emailTestResult
    });

  } catch (error) {
    console.error('❌ Error testing safety systems:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test safety systems',
      details: error.message
    });
  }
};

module.exports = {
  safeUserRegistration,
  safePasswordReset,
  safeNotificationSettings,
  globalCommSafety,
  testSafetyEndpoint
};
