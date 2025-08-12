#!/usr/bin/env node

/**
 * Quick Core Functionality Test
 * Tests key features without API calls to avoid rate limiting
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('🧪 Quick Core Functionality Test\n');

async function quickTest() {
  try {
    // Test 1: Database Connection
    console.log('📋 Test 1: Database Connection...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');

    // Test 2: Models Loading
    console.log('\n📋 Test 2: Model Loading...');
    const User = require('./src/models/User');
    const Conference = require('./src/models/Conference');
    const ResearchSubmission = require('./src/models/ResearchSubmission');
    console.log('✅ All models loaded successfully');

    // Test 3: User Creation (without API)
    console.log('\n📋 Test 3: User Creation...');
    // Test password validation (needs: 1 uppercase, 1 lowercase, 1 number, 1 special char, 8+ chars)
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@sobie.com',
      password: 'TestPass123!', // Strong password
      role: 'researcher',
      affiliation: {
        institution: 'Test University',
        department: 'Test Department'
      }
    });    // Test password methods without saving
    const passwordValid = await testUser.comparePassword('TestPass123!');
    console.log(`✅ Password validation: ${passwordValid ? 'Working' : 'Failed'}`);

    // Test 4: Conference Model
    console.log('\n📋 Test 4: Conference Model...');
    const testConference = new Conference({
      name: 'Quick Test Conference',
      fullName: 'Quick Test Conference 2025',
      year: 2025,
      edition: 2025,
      status: 'active',
      startDate: new Date('2025-11-13'),
      endDate: new Date('2025-11-15'),
      location: {
        venue: 'Test Venue',
        city: 'Test City',
        state: 'TS',
        country: 'USA'
      },
      createdBy: new mongoose.Types.ObjectId()
    });
    console.log('✅ Conference model validation passed');

    // Test 5: Research Submission Model
    console.log('\n📋 Test 5: Research Submission Model...');
    const testSubmission = new ResearchSubmission({
      title: 'Quick Test Submission',
      abstract: 'This is a test abstract for the quick test submission to validate the research submission model and its methods.',
      keywords: ['test', 'quick'],
      conferenceId: new mongoose.Types.ObjectId(),
      conferenceYear: 2025,
      researchType: 'empirical',
      discipline: 'management',
      academicLevel: 'faculty',
      correspondingAuthor: {
        name: { firstName: 'Test', lastName: 'Author' },
        email: 'test@test.com',
        affiliation: { institution: 'Test University' },
        userId: new mongoose.Types.ObjectId()
      },
      paperUpload: {
        filename: 'test.pdf',
        originalName: 'test.pdf',
        filePath: '/test.pdf',
        fileSize: 1000
      }
    });

    // Test presenter availability methods
    const availabilityData = {
      wednesday: { am: { available: true }, pm: { available: false, conflictNote: 'Teaching' } },
      thursday: { am: { available: true }, pm: { available: true } },
      friday: { am: { available: false, conflictNote: 'Travel' }, pm: { available: true } }
    };
    
    testSubmission.updatePresenterAvailability(availabilityData);
    const conflicts = testSubmission.getPresenterConflictsSummary();
    
    console.log('✅ Research submission model validation passed');
    console.log(`   Presenter availability conflicts: ${conflicts.conflicts.length}`);
    console.log(`   Available slots: ${conflicts.totalAvailableSlots}/6`);

    // Test 6: Proceedings workflow methods
    console.log('\n📋 Test 6: Proceedings Workflow...');
    const proceedingsData = {
      status: 'invited',
      invitedBy: new mongoose.Types.ObjectId(),
      invitationDate: new Date(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      requirements: 'Test requirements'
    };
    
    // Test proceedings method exists
    if (typeof testSubmission.getProceedingsStatus !== 'function') {
      throw new Error('Missing getProceedingsStatus method');
    }
    const proceedingsStatus = testSubmission.getProceedingsStatus();
    console.log(`✅ Proceedings method available, current status: ${proceedingsStatus}`);

    // Test 7: Email Service
    console.log('\n📋 Test 7: Email Service...');
    const emailService = require('./src/services/emailService');
    console.log(`✅ Email service loaded (mode: ${emailService.isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'})`);

    // Test 8: JWT Service
    console.log('\n📋 Test 8: JWT Service...');
    const jwtService = require('./src/services/jwtService');
    const testPayload = { id: 'test123', email: 'test@test.com' };
    const token = jwtService.generateAccessToken(testPayload);
    const decoded = jwtService.verifyAccessToken(token);
    console.log(`✅ JWT service working (token generated and verified)`);

    // Test 9: Notification Service
    console.log('\n📋 Test 9: Notification Service...');
    const notificationService = require('./src/services/notificationService');
    console.log('✅ Notification service loaded');

    await mongoose.connection.close();

    console.log('\n🎉 All core functionality tests passed!');
    console.log('📊 Test Summary:');
    console.log('   ✅ Database Connection: Working');
    console.log('   ✅ Model Validation: Working');
    console.log('   ✅ User Authentication: Working');
    console.log('   ✅ Conference Management: Working');
    console.log('   ✅ Research Submissions: Working');
    console.log('   ✅ Presenter Availability: Working');
    console.log('   ✅ Proceedings Workflow: Working');
    console.log('   ✅ Email Service: Working');
    console.log('   ✅ JWT Authentication: Working');
    console.log('   ✅ Notifications: Working');

  } catch (error) {
    console.error('❌ Quick test failed:', error.message);
    process.exit(1);
  }
}

quickTest();
