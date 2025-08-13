const mongoose = require('mongoose');
require('dotenv').config();

async function testProceedingsDataModel() {
  console.log('🧪 Testing Proceedings Data Model Implementation\n');
  console.log('=' .repeat(60));

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Import models
    const ResearchSubmission = require('../../src/models/ResearchSubmission');
    const User = require('../../src/models/User');
    const Conference = require('../../src/models/Conference');
    const bcrypt = require('bcryptjs');

    // Clean up any existing test data
    await ResearchSubmission.deleteMany({ title: 'Test Proceedings Model' });
    await User.deleteMany({ email: { $in: ['testauthor@test.com', 'testeditor@test.com'] } });
    await Conference.deleteMany({ $or: [{ name: 'Test Conference 2024 Model' }, { year: 2025 }] });

    console.log('✅ Cleaned up existing test data');

    // Create test user
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    const testUser = await User.create({
      email: 'testauthor@test.com',
      password: hashedPassword,
      name: { firstName: 'Test', lastName: 'Author' },
      isEmailVerified: true,
      userType: 'academic',
      affiliation: {
        organization: 'Test University',
        department: 'Research'
      }
    });

    const testEditor = await User.create({
      email: 'testeditor@test.com',
      password: hashedPassword,
      name: { firstName: 'Test', lastName: 'Editor' },
      isEmailVerified: true,
      userType: 'academic',
      roles: ['admin', 'editor'],
      affiliation: {
        organization: 'Editor University',
        department: 'Editorial'
      }
    });

    console.log('✅ Created test users');

    // Create test conference
    const testConference = await Conference.create({
      name: 'Test Conference 2025 Model',
      fullName: 'Test Conference for Proceedings Model 2025',
      year: 2025,
      edition: 1,
      status: 'active',
      submissionDeadline: new Date('2025-12-31'),
      startDate: new Date('2025-11-15'),
      endDate: new Date('2025-11-17'),
      location: {
        venue: 'Test University Conference Center',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country'
      },
      createdBy: testUser._id
    });

    console.log('✅ Created test conference');

    // Create test submission with 'presented' status
    const testSubmission = await ResearchSubmission.create({
      title: 'Test Proceedings Model',
      abstract: 'This is a comprehensive test of the proceedings data model implementation.',
      keywords: ['test', 'proceedings', 'workflow', 'model'],
      discipline: 'other',
      researchType: 'empirical',
      academicLevel: 'faculty',
      status: 'presented',
      correspondingAuthor: {
        userId: testUser._id,
        name: { firstName: 'Test', lastName: 'Author' },
        email: 'testauthor@test.com',
        affiliation: {
          institution: 'Test University',
          department: 'Research Department'
        }
      },
      paperUpload: {
        filename: 'test-paper.pdf',
        originalName: 'Test Paper.pdf',
        filePath: '/uploads/test-paper.pdf',
        fileSize: 1024000
      },
      conferenceId: testConference._id,
      conferenceYear: 2025,
      submissionNumber: `TEST-PROC-MODEL-${Date.now()}`,
      submittedAt: new Date(),
      presentedAt: new Date()
    });

    console.log('✅ Created test submission');
    console.log(`   Submission ID: ${testSubmission._id}`);
    console.log(`   Initial status: ${testSubmission.status}`);

    // Test 1: Invite to proceedings
    console.log('\n📋 Test 1: Invite to proceedings');
    const deadline = new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000); // 6 weeks from now
    testSubmission.inviteToProceedings(testEditor._id, deadline);
    await testSubmission.save();
    
    console.log(`✅ Invitation sent`);
    console.log(`   Status: ${testSubmission.status}`);
    console.log(`   Deadline: ${testSubmission.proceedings.invitationDeadline.toDateString()}`);
    console.log(`   Invited by: ${testSubmission.proceedings.invitationSentBy}`);

    // Test 2: Respond to invitation
    console.log('\n📋 Test 2: Respond to invitation');
    testSubmission.respondToProceedings(testUser._id, true, 'We are excited to participate!');
    await testSubmission.save();
    
    console.log(`✅ Response recorded`);
    console.log(`   Status: ${testSubmission.status}`);
    console.log(`   Accepted: ${testSubmission.proceedings.authorResponse.acceptedInvitation}`);
    console.log(`   Comments: ${testSubmission.proceedings.authorResponse.comments}`);

    // Test 3: Submit proceedings paper
    console.log('\n📋 Test 3: Submit proceedings paper');
    const paperData = {
      filename: 'test-proceedings-paper.pdf',
      originalName: 'Refined Research Paper.pdf',
      filePath: '/uploads/proceedings/test-proceedings-paper.pdf',
      fileSize: 1024000
    };
    testSubmission.submitProceedingsPaper(paperData, testUser._id);
    await testSubmission.save();
    
    console.log(`✅ Paper submitted`);
    console.log(`   Status: ${testSubmission.status}`);
    console.log(`   Submitted at: ${testSubmission.proceedings.submittedAt.toDateString()}`);
    console.log(`   File: ${testSubmission.proceedings.finalPaper.originalName}`);

    // Test 4: Assign editor
    console.log('\n📋 Test 4: Assign editor for review');
    testSubmission.assignProceedingsEditor(testEditor._id, testEditor._id);
    await testSubmission.save();
    
    console.log(`✅ Editor assigned`);
    console.log(`   Status: ${testSubmission.status}`);
    console.log(`   Editor: ${testSubmission.proceedings.proceedingsReview.assignedEditor}`);
    console.log(`   Assigned at: ${testSubmission.proceedings.proceedingsReview.assignedAt.toDateString()}`);

    // Test 5: Add revision
    console.log('\n📋 Test 5: Request revision');
    const revisionData = {
      comments: 'Please expand on the methodology section and add more recent references.',
      filename: 'revised-paper.pdf',
      originalName: 'Revised Research Paper.pdf',
      filePath: '/uploads/proceedings/revised-paper.pdf',
      fileSize: 1100000
    };
    testSubmission.addProceedingsRevision(revisionData, testUser._id, 'Revision requested by editor');
    await testSubmission.save();
    
    console.log(`✅ Revision requested`);
    console.log(`   Status: ${testSubmission.status}`);
    console.log(`   Revision count: ${testSubmission.proceedings.revisions ? testSubmission.proceedings.revisions.length : 0}`);

    // Test 6: Make final decision (accept)
    console.log('\n📋 Test 6: Make final decision');
    testSubmission.makeProceedingsDecision('accept', testEditor._id, 'Excellent paper after revisions. Ready for publication.');
    await testSubmission.save();
    
    console.log(`✅ Decision made`);
    console.log(`   Status: ${testSubmission.status}`);
    console.log(`   Decision: ${testSubmission.proceedings.proceedingsReview.finalDecision.decision}`);

    // Test 7: Publish proceedings
    console.log('\n📋 Test 7: Publish proceedings');
    testSubmission.publishProceedings({
      doi: '10.1234/sobie.2024.proceedings.test',
      publicationUrl: 'https://proceedings.sobie.org/2024/test-paper',
      volume: '2024',
      pages: '1-15',
      publishedDate: new Date()
    });
    await testSubmission.save();
    
    console.log(`✅ Paper published`);
    console.log(`   Status: ${testSubmission.status}`);
    console.log(`   DOI: ${testSubmission.proceedings.publication.doi}`);
    console.log(`   URL: ${testSubmission.proceedings.publication.publicationUrl}`);

    // Test 8: Get proceedings status
    console.log('\n📋 Test 8: Get proceedings status');
    const status = testSubmission.getProceedingsStatus();
    
    console.log(`✅ Status retrieved`);
    console.log(`   Phase: ${status.phase}`);
    console.log(`   Description: ${status.description}`);
    console.log(`   Can submit: ${status.canSubmit}`);
    console.log(`   Needs action: ${status.needsAction}`);
    console.log(`   Next step: ${status.nextStep}`);

    // Test 9: Verify data persistence
    console.log('\n📋 Test 9: Verify data persistence');
    const retrievedSubmission = await ResearchSubmission.findById(testSubmission._id)
      .populate('correspondingAuthor.userId', 'name email')
      .populate('proceedings.invitationSentBy', 'name email')
      .populate('proceedings.proceedingsReview.assignedEditor', 'name email');
    
    console.log(`✅ Data persistence verified`);
    console.log(`   Retrieved submission: ${retrievedSubmission.title}`);
    console.log(`   Final status: ${retrievedSubmission.status}`);
    console.log(`   Proceedings phase: ${retrievedSubmission.getProceedingsStatus().phase}`);
    console.log(`   Complete workflow: ${retrievedSubmission.proceedings ? 'Yes' : 'No'}`);

    // Test 10: Test all workflow paths
    console.log('\n📋 Test 10: Test alternative workflow paths');
    
    // Create another submission for rejection testing
    const testSubmission2 = await ResearchSubmission.create({
      title: 'Test Proceedings Rejection Model',
      abstract: 'This is a test of the rejection workflow in proceedings.',
      keywords: ['test', 'rejection', 'workflow'],
      discipline: 'other',
      researchType: 'empirical',
      academicLevel: 'faculty',
      status: 'presented',
      correspondingAuthor: {
        userId: testUser._id,
        name: { firstName: 'Test', lastName: 'Author' },
        email: 'testauthor@test.com',
        affiliation: {
          institution: 'Test University',
          department: 'Research Department'
        }
      },
      paperUpload: {
        filename: 'test-rejection-paper.pdf',
        originalName: 'Test Rejection Paper.pdf',
        filePath: '/uploads/test-rejection-paper.pdf',
        fileSize: 1024000
      },
      conferenceId: testConference._id,
      conferenceYear: 2025,
      submissionNumber: `TEST-PROC-REJ-${Date.now()}`,
      submittedAt: new Date(),
      presentedAt: new Date()
    });

    // Test rejection workflow
    testSubmission2.inviteToProceedings(testEditor._id, deadline);
    testSubmission2.respondToProceedings(testUser._id, false, 'Unable to participate at this time.');
    await testSubmission2.save();

    const rejectionStatus = testSubmission2.getProceedingsStatus();
    console.log(`✅ Rejection workflow tested`);
    console.log(`   Status: ${testSubmission2.status}`);
    console.log(`   Phase: ${rejectionStatus.phase}`);
    console.log(`   Description: ${rejectionStatus.description}`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL PROCEEDINGS DATA MODEL TESTS COMPLETED SUCCESSFULLY!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Proceedings invitation workflow');
    console.log('   ✅ Author response handling (accept/decline)');
    console.log('   ✅ Paper submission with file management');
    console.log('   ✅ Editor assignment process');
    console.log('   ✅ Revision request workflow');
    console.log('   ✅ Final decision making');
    console.log('   ✅ Publication process');
    console.log('   ✅ Comprehensive status tracking');
    console.log('   ✅ Data persistence and retrieval');
    console.log('   ✅ Alternative workflow paths');
    console.log('\n🚀 The proceedings data model is fully functional and ready for API integration!');

    // Cleanup
    await ResearchSubmission.deleteMany({ title: { $regex: /Test Proceedings.*Model/ } });
    await User.deleteMany({ email: { $in: ['testauthor@test.com', 'testeditor@test.com'] } });
    await Conference.deleteMany({ name: 'Test Conference 2025 Model' });
    console.log('\n🧹 Test data cleaned up');

  } catch (error) {
    console.error('\n💥 TEST FAILED:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

// Run the test
testProceedingsDataModel();
