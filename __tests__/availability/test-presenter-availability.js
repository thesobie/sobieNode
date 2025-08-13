const mongoose = require('mongoose');
require('dotenv').config();

async function testPresenterAvailability() {
  try {
    console.log('🧪 Testing Presenter Availability Functionality\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Get models
    const ResearchSubmission = require('../../src/models/ResearchSubmission');
    const User = require('../../src/models/User');
    const Conference = require('../../src/models/Conference');

    // Find or create a test conference
    let testConference = await Conference.findOne({ name: 'SOBIE 2025' });
    if (!testConference) {
      testConference = await Conference.create({
        name: 'SOBIE 2025',
        fullName: 'Society of Business in Education Conference 2025',
        year: 2025,
        edition: 2025,
        status: 'active',
        startDate: new Date('2025-11-13'),
        endDate: new Date('2025-11-15'),
        submissionDeadline: new Date('2025-12-01'),
        conferenceDate: new Date('2025-11-15'),
        location: {
          venue: 'Test Conference Center',
          city: 'Test City',
          state: 'TS',
          country: 'USA'
        },
        createdBy: new mongoose.Types.ObjectId()
      });
      console.log('✅ Created test conference');
    }

    // Find an existing user or create one
    let testUser = await User.findOne({ email: 'presenter-test@test.com' });
    if (!testUser) {
      testUser = await User.create({
        email: 'presenter-test@test.com',
        password: 'TestPassword123!',
        name: { firstName: 'Presenter', lastName: 'Test' },
        isEmailVerified: true,
        userType: 'academic',
        affiliation: {
          organization: 'Test University',
          department: 'Business'
        }
      });
      console.log('✅ Created test user');
    }

    // Create a test submission
    const testSubmission = await ResearchSubmission.create({
      title: 'Test Presentation with Availability Preferences',
      abstract: 'This is a test submission to demonstrate presenter availability tracking functionality for the SOBIE conference scheduling system.',
      keywords: ['test', 'presenter', 'availability'],
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
        filename: 'test-paper.pdf',
        originalName: 'Test Paper.pdf',
        filePath: '/uploads/test-paper.pdf',
        fileSize: 1024000
      },
      status: 'accepted'
    });

    console.log('✅ Created test submission');

    // Test updating presenter availability
    console.log('\n📅 Testing presenter availability updates...');

    const availabilityData = {
      wednesday: {
        am: { available: true },
        pm: { available: false, conflictNote: 'Teaching class from 1-3 PM' }
      },
      thursday: {
        am: { available: true },
        pm: { available: true }
      },
      friday: {
        am: { available: false, conflictNote: 'Travel departure - flight at 11 AM' },
        pm: { available: false, conflictNote: 'Already departed' }
      },
      generalNotes: 'Prefer Thursday morning or Wednesday morning if possible. Very flexible on exact timing within those slots.'
    };

    const updatedAvailability = testSubmission.updatePresenterAvailability(availabilityData);
    await testSubmission.save();

    console.log('✅ Updated presenter availability');
    console.log('📋 Availability data:', JSON.stringify(updatedAvailability, null, 2));

    // Test getting conflicts summary
    const conflictsSummary = testSubmission.getPresenterConflictsSummary();
    console.log('\n📊 Conflicts Summary:');
    console.log(`   Has conflicts: ${conflictsSummary.hasConflicts}`);
    console.log(`   Available slots: ${conflictsSummary.totalAvailableSlots}/6`);
    console.log(`   Conflicts:`, conflictsSummary.conflicts);
    console.log(`   General notes: "${conflictsSummary.generalNotes}"`);

    // Test admin query for all submissions with conflicts
    console.log('\n🔍 Testing admin availability overview...');
    
    const submissionsWithConflicts = await ResearchSubmission.find({
      conferenceYear: 2025,
      status: { $in: ['accepted', 'presented'] },
      'presentationDetails.presenterAvailability': { $exists: true }
    }).select('title presentationDetails');

    console.log(`✅ Found ${submissionsWithConflicts.length} submissions with availability data`);

    submissionsWithConflicts.forEach(submission => {
      const summary = submission.getPresenterConflictsSummary();
      if (summary.hasConflicts) {
        console.log(`   📝 "${submission.title}": ${summary.conflicts.length} conflicts`);
        summary.conflicts.forEach(conflict => {
          console.log(`      - ${conflict.day} ${conflict.period}: ${conflict.note}`);
        });
      }
    });

    // Clean up test data
    await ResearchSubmission.deleteOne({ _id: testSubmission._id });
    await Conference.deleteOne({ _id: testConference._id });
    await User.deleteOne({ _id: testUser._id });

    console.log('\n🧹 Cleaned up test data');
    await mongoose.connection.close();

    console.log('\n🎉 All presenter availability tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPresenterAvailability();
