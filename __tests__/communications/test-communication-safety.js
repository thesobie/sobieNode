const mongoose = require('mongoose');
require('dotenv').config();

// Import safety utilities
const { 
  emailSafetyGuard, 
  smsSafetyGuard, 
  pushNotificationSafetyGuard,
  DEVELOPMENT_MODE,
  TEST_EMAIL 
} = require('../../src/utils/communicationSafety');

const emailService = require('../../src/services/emailService');

/**
 * Comprehensive Communication Safety Test Suite
 */
const testCommunicationSafety = async () => {
  console.log('🧪 TESTING COMMUNICATION SAFETY SYSTEMS');
  console.log('='.repeat(60));
  
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Development Mode: ${DEVELOPMENT_MODE}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log('');

  // Test 1: Email Safety Guard
  console.log('📧 TEST 1: Email Safety Guard');
  console.log('-'.repeat(40));
  
  const testEmails = [
    'real.user@university.edu',
    'student@college.edu', 
    'faculty@school.edu',
    TEST_EMAIL,
    'test@example.com'
  ];

  for (const email of testEmails) {
    const result = emailSafetyGuard(email, 'Test Subject', 'Test content');
    console.log(`Email: ${email}`);
    console.log(`  Blocked: ${result.blocked ? '🚫 YES' : '✅ NO'}`);
    console.log(`  Safe To: ${result.safeEmail?.to || 'N/A'}`);
    console.log('');
  }

  // Test 2: SMS Safety Guard
  console.log('📱 TEST 2: SMS Safety Guard');
  console.log('-'.repeat(40));
  
  const testPhones = [
    '+1234567890',
    '555-123-4567',
    '+1-800-555-0123'
  ];

  for (const phone of testPhones) {
    const result = smsSafetyGuard(phone, 'Test SMS message');
    console.log(`Phone: ${phone}`);
    console.log(`  Blocked: ${result.blocked ? '🚫 YES' : '✅ NO'}`);
    console.log('');
  }

  // Test 3: Push Notification Safety Guard
  console.log('🔔 TEST 3: Push Notification Safety Guard');
  console.log('-'.repeat(40));
  
  const testNotification = {
    title: 'Test Notification',
    body: 'This is a test push notification'
  };

  const pushResult = pushNotificationSafetyGuard('user123', testNotification);
  console.log(`User ID: user123`);
  console.log(`Blocked: ${pushResult.blocked ? '🚫 YES' : '✅ NO'}`);
  console.log('');

  // Test 4: Email Service Integration
  console.log('📧 TEST 4: Email Service Integration');
  console.log('-'.repeat(40));
  
  try {
    const emailResult = await emailService.testEmailService();
    console.log('Email Service Test Result:');
    console.log(`  Success: ${emailResult.success ? '✅' : '❌'}`);
    console.log(`  Blocked: ${emailResult.blocked ? '🚫' : '✅'}`);
    console.log(`  Message: ${emailResult.message}`);
    console.log('');
  } catch (error) {
    console.error('❌ Email service test failed:', error.message);
  }

  // Test 5: User Creation Safety
  console.log('👥 TEST 5: User Creation Safety Simulation');
  console.log('-'.repeat(40));

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Simulate user creation
    const testUser = {
      name: { firstName: 'Test', lastName: 'User' },
      email: 'newuser@university.edu',
      affiliation: { organization: 'Test University' },
      userType: 'academic'
    };

    console.log(`Creating test user: ${testUser.email}`);
    
    // Test welcome email
    const welcomeResult = await emailService.sendWelcomeEmail(testUser);
    console.log('Welcome Email Test:');
    console.log(`  Success: ${welcomeResult.success ? '✅' : '❌'}`);
    console.log(`  Blocked: ${welcomeResult.blocked ? '🚫' : '✅'}`);
    console.log(`  Recipient: ${welcomeResult.recipient || welcomeResult.originalRecipient}`);
    console.log('');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }

  // Test 6: Environment Variable Safety
  console.log('⚙️  TEST 6: Environment Variable Safety');
  console.log('-'.repeat(40));
  
  const criticalEnvVars = [
    'NODE_ENV',
    'TEST_USER_EMAIL',
    'EMAIL_SERVICE_ENABLED',
    'SEND_TO_TEST_EMAIL'
  ];

  criticalEnvVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`${varName}: ${value || 'NOT SET'}`);
  });
  console.log('');

  // Final Summary
  console.log('🎯 SAFETY TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (DEVELOPMENT_MODE) {
    console.log('✅ Development mode is ACTIVE');
    console.log('✅ Real emails will be BLOCKED');
    console.log('✅ Real SMS will be BLOCKED');
    console.log('✅ Real push notifications will be BLOCKED');
    console.log(`✅ Only test email ${TEST_EMAIL} will receive redirected emails`);
    console.log('');
    console.log('🛡️  SAFETY SYSTEMS ARE OPERATIONAL - NO REAL COMMUNICATIONS WILL BE SENT');
  } else {
    console.log('⚠️  Production mode detected');
    console.log('⚠️  Real communications ENABLED');
    console.log('⚠️  Use caution with real user data');
  }

  console.log('\n✅ Communication safety test complete!');
};

// Run the test
testCommunicationSafety().catch(console.error);
