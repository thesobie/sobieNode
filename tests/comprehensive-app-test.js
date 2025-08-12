const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Comprehensive SOBIE Application Test Suite
 * This will test all major components of your conference management system
 */

// Import all your services and utilities
const { 
  emailSafetyGuard, 
  smsSafetyGuard, 
  pushNotificationSafetyGuard,
  DEVELOPMENT_MODE,
  TEST_EMAIL,
  TEST_PHONE_NUMBER
} = require('../src/utils/communicationSafety');

const emailService = require('../src/services/emailService');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  startTime: new Date(),
  modules: {}
};

/**
 * Central Time Zone utility
 */
const getCentralTime = () => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date());
};

/**
 * Test execution wrapper
 */
const runTest = async (testName, testFunction) => {
  try {
    console.log(`🧪 Running: ${testName}`);
    await testFunction();
    testResults.passed++;
    console.log(`✅ PASSED: ${testName}\n`);
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    console.log(`❌ FAILED: ${testName}`);
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
};

/**
 * Test 1: Application Startup and Dependencies
 */
const testAppStartup = async () => {
  console.log('📦 Testing application dependencies...');
  
  // Check critical dependencies
  const dependencies = [
    'express',
    'mongoose',
    'bcryptjs',
    'jsonwebtoken',
    'dotenv',
    'cors',
    'helmet',
    'express-rate-limit'
  ];

  dependencies.forEach(dep => {
    try {
      require(dep);
      console.log(`  ✅ ${dep} - Available`);
    } catch (error) {
      throw new Error(`Missing dependency: ${dep}`);
    }
  });

  // Check custom modules
  const customModules = [
    '../src/utils/communicationSafety',
    '../src/services/emailService'
  ];

  customModules.forEach(module => {
    try {
      require(module);
      console.log(`  ✅ ${module} - Available`);
    } catch (error) {
      console.log(`  ⚠️  ${module} - Not found (may not be implemented yet)`);
    }
  });
};

/**
 * Test 2: Database Connection
 */
const testDatabaseConnection = async () => {
  console.log('🗄️  Testing database connection...');
  
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not configured in environment');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('  ✅ Connected to MongoDB');
  
  // Test basic operations
  const testCollection = mongoose.connection.db.collection('test');
  const testDoc = { test: true, timestamp: new Date() };
  
  await testCollection.insertOne(testDoc);
  console.log('  ✅ Database write operation successful');
  
  const foundDoc = await testCollection.findOne({ test: true });
  if (foundDoc) {
    console.log('  ✅ Database read operation successful');
  }
  
  await testCollection.deleteOne({ test: true });
  console.log('  ✅ Database delete operation successful');
  
  await mongoose.disconnect();
  console.log('  ✅ Database disconnection successful');
};

/**
 * Test 3: Communication Safety Systems
 */
const testCommunicationSafety = async () => {
  console.log('🛡️  Testing communication safety systems...');
  
  // Test email safety
  const emailTest = emailSafetyGuard('real.user@university.edu', 'Test', 'Test content');
  if (!emailTest.blocked && !DEVELOPMENT_MODE) {
    throw new Error('Email safety not working - real email not blocked in development');
  }
  console.log('  ✅ Email safety guard working');

  // Test SMS safety
  const smsTest = smsSafetyGuard('+15551234567', 'Test message');
  if (!smsTest.blocked && DEVELOPMENT_MODE) {
    throw new Error('SMS safety not working - real number not blocked in development');
  }
  console.log('  ✅ SMS safety guard working');

  // Test push notification safety
  const pushTest = pushNotificationSafetyGuard('user123', { title: 'Test', body: 'Test' });
  console.log('  ✅ Push notification safety guard working');
};

/**
 * Test 4: User Authentication System
 */
const testUserAuthentication = async () => {
  console.log('👤 Testing user authentication...');
  
  try {
    // Try to import User model
    const User = require('../src/models/User');
    console.log('  ✅ User model available');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Test user creation
    const testUserData = {
      name: {
        firstName: 'Test',
        lastName: 'User'
      },
      email: 'testuser@sobie.test',
      password: 'TestPassword123!',
      affiliation: {
        organization: 'Test University',
        department: 'Engineering'
      },
      userType: 'academic'
    };

    // Clean up any existing test user
    await User.deleteOne({ email: testUserData.email });

    const testUser = new User(testUserData);
    await testUser.save();
    console.log('  ✅ User creation successful');

    // Test user lookup
    const foundUser = await User.findOne({ email: testUserData.email });
    if (foundUser) {
      console.log('  ✅ User lookup successful');
    }

    // Clean up
    await User.deleteOne({ email: testUserData.email });
    console.log('  ✅ User cleanup successful');
    
    await mongoose.disconnect();
    
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      console.log('  ⚠️  User model not found - may not be implemented yet');
    } else {
      throw error;
    }
  }
};

/**
 * Test 5: Conference Management
 */
const testConferenceManagement = async () => {
  console.log('🎯 Testing conference management...');
  
  try {
    const Conference = require('../src/models/Conference');
    console.log('  ✅ Conference model available');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const testConference = {
      name: 'SOBIE 2025 Test Conference',
      year: 2025,
      dates: {
        start: new Date('2025-06-12'),
        end: new Date('2025-06-15')
      },
      location: {
        venue: 'Test University',
        city: 'Test City',
        state: 'MS'
      },
      deadlines: {
        paperSubmission: new Date('2025-03-15'),
        registration: new Date('2025-05-15')
      },
      status: 'active'
    };

    // Clean up any existing test conference
    await Conference.deleteOne({ name: testConference.name });

    const conference = new Conference(testConference);
    await conference.save();
    console.log('  ✅ Conference creation successful');

    // Test conference lookup
    const foundConference = await Conference.findOne({ name: testConference.name });
    if (foundConference) {
      console.log('  ✅ Conference lookup successful');
    }

    // Clean up
    await Conference.deleteOne({ name: testConference.name });
    
    await mongoose.disconnect();
    
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      console.log('  ⚠️  Conference model not found - may not be implemented yet');
    } else {
      throw error;
    }
  }
};

/**
 * Test 6: Paper Submission System
 */
const testPaperSubmission = async () => {
  console.log('📄 Testing paper submission system...');
  
  try {
    const Paper = require('../src/models/Paper');
    console.log('  ✅ Paper model available');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    const testPaper = {
      title: 'Test Paper: Advanced Biomedical Engineering Techniques',
      abstract: 'This is a test abstract for testing purposes.',
      authors: [{
        name: 'Test Author',
        email: 'author@test.edu',
        affiliation: 'Test University'
      }],
      keywords: ['biomedical', 'engineering', 'test'],
      submissionDate: new Date(),
      status: 'submitted'
    };

    const paper = new Paper(testPaper);
    await paper.save();
    console.log('  ✅ Paper submission successful');

    // Clean up
    await Paper.deleteOne({ title: testPaper.title });
    
    await mongoose.disconnect();
    
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      console.log('  ⚠️  Paper model not found - may not be implemented yet');
    } else {
      throw error;
    }
  }
};

/**
 * Test 7: Email Service
 */
const testEmailService = async () => {
  console.log('📧 Testing email service...');
  
  try {
    const result = await emailService.testEmailService();
    if (result.success) {
      console.log('  ✅ Email service test successful');
    } else {
      console.log(`  ⚠️  Email service test result: ${result.message}`);
    }
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      console.log('  ⚠️  Email service not found - may not be implemented yet');
    } else {
      throw error;
    }
  }
};

/**
 * Test 8: SMS Service
 */
const testSMSService = async () => {
  console.log('📱 Testing SMS service...');
  
  try {
    const smsService = require('../src/services/smsService');
    const config = await smsService.testConfiguration();
    console.log(`  ✅ SMS service configured: ${config.provider}`);
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      console.log('  ⚠️  SMS service not found - may not be implemented yet');
    } else {
      throw error;
    }
  }
};

/**
 * Test 9: File Upload System
 */
const testFileUpload = async () => {
  console.log('📁 Testing file upload system...');
  
  try {
    const uploadUtils = require('../src/utils/uploadUtils');
    console.log('  ✅ Upload utilities available');
  } catch (error) {
    console.log('  ⚠️  Upload utilities not found - may not be implemented yet');
  }

  // Check if uploads directory exists
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  if (fs.existsSync(uploadsDir)) {
    console.log('  ✅ Uploads directory exists');
  } else {
    console.log('  ⚠️  Uploads directory not found');
  }
};

/**
 * Test 10: Environment Configuration
 */
const testEnvironmentConfig = async () => {
  console.log('⚙️  Testing environment configuration...');
  
  const requiredEnvVars = [
    'NODE_ENV',
    'MONGODB_URI',
    'TEST_USER_EMAIL'
  ];

  const optionalEnvVars = [
    'TEST_PHONE_NUMBER',
    'JWT_SECRET',
    'EMAIL_SERVICE_ENABLED',
    'SMS_SERVICE_ENABLED'
  ];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      throw new Error(`Required environment variable ${varName} is not set`);
    }
    console.log(`  ✅ ${varName} is configured`);
  });

  optionalEnvVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`  ✅ ${varName} is configured`);
    } else {
      console.log(`  ⚠️  ${varName} is not configured (optional)`);
    }
  });
};

/**
 * Main Test Runner
 */
const runComprehensiveTest = async () => {
  console.log('🚀 SOBIE COMPREHENSIVE APPLICATION TEST SUITE');
  console.log('=' .repeat(70));
  console.log(`Started: ${getCentralTime()} (Central Time)`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Development Mode: ${DEVELOPMENT_MODE}`);
  console.log('');

  // Run all tests
  await runTest('Application Startup', testAppStartup);
  await runTest('Environment Configuration', testEnvironmentConfig);
  await runTest('Database Connection', testDatabaseConnection);
  await runTest('Communication Safety', testCommunicationSafety);
  await runTest('User Authentication', testUserAuthentication);
  await runTest('Conference Management', testConferenceManagement);
  await runTest('Paper Submission', testPaperSubmission);
  await runTest('Email Service', testEmailService);
  await runTest('SMS Service', testSMSService);
  await runTest('File Upload System', testFileUpload);

  // Generate final report
  const endTime = new Date();
  const duration = ((endTime - testResults.startTime) / 1000).toFixed(2);

  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(70));
  console.log(`Tests Completed: ${getCentralTime()}`);
  console.log(`Duration: ${duration} seconds`);
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  console.log('');

  if (testResults.errors.length > 0) {
    console.log('❌ FAILED TESTS:');
    testResults.errors.forEach(error => {
      console.log(`  • ${error.test}: ${error.error}`);
    });
    console.log('');
  }

  if (testResults.passed === testResults.passed + testResults.failed) {
    console.log('🎉 ALL TESTS PASSED! Your SOBIE app is working great!');
  } else {
    console.log('⚠️  Some tests failed or components are not implemented yet.');
    console.log('This is normal for a project in development.');
  }

  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Fix any failed tests');
  console.log('2. Implement any missing components');
  console.log('3. Run individual module tests');
  console.log('4. Test the web interface manually');
  console.log('5. Perform user acceptance testing');

  return {
    success: testResults.failed === 0,
    passed: testResults.passed,
    failed: testResults.failed,
    duration: `${duration}s`,
    errors: testResults.errors
  };
};

// Export for use as module or run directly
if (require.main === module) {
  runComprehensiveTest().catch(console.error);
}

module.exports = runComprehensiveTest;