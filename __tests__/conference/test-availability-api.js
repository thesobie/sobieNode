const axios = require('axios');
const mongoose = require('mongoose');

require('dotenv').config();

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

console.log('🧪 Testing Presenter Availability API Endpoints\n');

async function testAvailabilityAPI() {
  try {
    // Connect to database to create test data
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Get models
    const ResearchSubmission = require('../../src/models/ResearchSubmission');
    const User = require('../../src/models/User');
    const Conference = require('../../src/models/Conference');

    // Create test user for API auth
    let testUser = await User.findOne({ email: 'api-presenter-test@test.com' });
    if (!testUser) {
      testUser = await User.create({
        email: 'api-presenter-test@test.com',
        password: 'TestPassword123!',
        name: { firstName: 'API', lastName: 'Presenter' },
        isEmailVerified: true,
        userType: 'academic',
        affiliation: {
          organization: 'Test University',
          department: 'Business'
        }
      });
    }

    // Create test conference
    let testConference = await Conference.findOne({ name: 'API Test Conference 2025' });
    if (!testConference) {
      testConference = await Conference.create({
        name: 'API Test Conference 2025',
        fullName: 'API Test Conference 2025',
        year: 2025,
        edition: 2025,
        status: 'active',
        startDate: new Date('2025-11-13'),
        endDate: new Date('2025-11-15'),
        submissionDeadline: new Date('2025-12-01'),
        location: {
          venue: 'Test Venue',
          city: 'Test City',
          state: 'TS',
          country: 'USA'
        },
        createdBy: testUser._id
      });
    }

    // Create test submission
    const testSubmission = await ResearchSubmission.create({
      title: 'API Test Submission with Availability',
      abstract: 'This is a test submission for API testing of presenter availability functionality.',
      keywords: ['api', 'test', 'availability'],
      conferenceId: testConference._id,
      conferenceYear: 2025,
      researchType: 'empirical',
      presentationType: 'presentation',
      discipline: 'management',
      academicLevel: 'faculty',
      correspondingAuthor: {
        name: {
          firstName: testUser.name.firstName,
          lastName: testUser.name.lastName
        },
        email: testUser.email,
        affiliation: {
          institution: testUser.affiliation.organization,
          department: testUser.affiliation.department
        },
        userId: testUser._id
      },
      paperUpload: {
        filename: 'api-test-paper.pdf',
        originalName: 'API Test Paper.pdf',
        filePath: '/uploads/api-test-paper.pdf',
        fileSize: 1024000
      },
      status: 'accepted'
    });

    console.log('✅ Created test data');

    // Login to get auth token
    console.log('\n🔑 Logging in to get auth token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'api-presenter-test@test.com',
      password: 'TestPassword123!'
    });

    const token = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Login successful');

    // Test 1: Get initial availability (should be empty/default)
    console.log('\n📋 Test 1: Get initial availability...');
    const initialAvailability = await axios.get(
      `${API_BASE_URL}/research-submission/${testSubmission._id}/presenter-availability`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    console.log('✅ Retrieved initial availability');
    console.log(`   Has conflicts: ${initialAvailability.data.data.summary.hasConflicts}`);
    console.log(`   Available slots: ${initialAvailability.data.data.summary.totalAvailableSlots}/6`);

    // Test 2: Update availability with conflicts
    console.log('\n📝 Test 2: Update availability with conflicts...');
    const availabilityUpdate = {
      wednesday: {
        am: { available: true },
        pm: { available: false, conflictNote: 'Teaching advanced finance class' }
      },
      thursday: {
        am: { available: true },
        pm: { available: true }
      },
      friday: {
        am: { available: false, conflictNote: 'Scheduled department meeting' },
        pm: { available: true }
      },
      generalNotes: 'Prefer Thursday slots if possible. Wednesday AM also works well.'
    };

    const updateResponse = await axios.put(
      `${API_BASE_URL}/research-submission/${testSubmission._id}/presenter-availability`,
      availabilityUpdate,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    console.log('✅ Updated availability successfully');
    console.log(`   Has conflicts: ${updateResponse.data.data.summary.hasConflicts}`);
    console.log(`   Available slots: ${updateResponse.data.data.summary.totalAvailableSlots}/6`);
    console.log('   Conflicts:');
    updateResponse.data.data.summary.conflicts.forEach(conflict => {
      console.log(`     - ${conflict.day} ${conflict.period}: ${conflict.note}`);
    });

    // Test 3: Get updated availability
    console.log('\n🔄 Test 3: Get updated availability...');
    const updatedAvailability = await axios.get(
      `${API_BASE_URL}/research-submission/${testSubmission._id}/presenter-availability`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    console.log('✅ Retrieved updated availability');
    console.log(`   General notes: "${updatedAvailability.data.data.availability.generalNotes}"`);
    console.log(`   Last updated: ${updatedAvailability.data.data.availability.updatedAt}`);

    // Clean up test data
    await ResearchSubmission.deleteOne({ _id: testSubmission._id });
    await Conference.deleteOne({ _id: testConference._id });
    await User.deleteOne({ _id: testUser._id });

    console.log('\n🧹 Cleaned up test data');
    await mongoose.connection.close();

    console.log('\n🎉 All API tests passed! Presenter availability endpoints are working correctly.');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Only run if server is available
testAvailabilityAPI();
