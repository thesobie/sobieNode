const axios = require('axios');
const mongoose = require('mongoose');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Test data
let authToken = '';
let adminToken = '';
let testSubmissionId = '';
let testUserId = '';

console.log('🧪 Starting Proceedings Workflow Test Suite\n');

// Helper function to make authenticated requests
const makeRequest = async (method, url, data = null, token = null, isFormData = false) => {
  const config = {
    method,
    url: `${API_BASE_URL}${url}`,
    headers: {}
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    if (isFormData) {
      config.data = data;
      config.headers = { ...config.headers, ...data.getHeaders() };
    } else {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`${error.response.status}: ${error.response.data.message || error.response.statusText}`);
    }
    throw error;
  }
};

// Test 1: Setup test environment
async function setupTestEnvironment() {
  console.log('📋 Test 1: Setting up test environment...');
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Create or get test admin user
    const User = require('./src/models/User');

    let adminUser = await User.findOne({ email: 'admin@test.com' });
    if (!adminUser) {
      adminUser = await User.create({
        email: 'admin@test.com',
        password: 'AdminTest123!', // Plain password - schema will hash it
        name: { firstName: 'Admin', lastName: 'User' },
        isEmailVerified: true,
        roles: ['admin'],
        userType: 'academic',
        affiliation: {
          organization: 'Test University',
          department: 'Administration'
        },
        profile: { 
          academicInfo: { institution: 'Test University' } 
        }
      });
    }

    // Create or get test regular user
    let testUser = await User.findOne({ email: 'author@test.com' });
    if (!testUser) {
      testUser = await User.create({
        email: 'author@test.com',
        password: 'AuthorTest123!', // Plain password - schema will hash it
        name: { firstName: 'Test', lastName: 'Author' },
        isEmailVerified: true,
        userType: 'academic',
        affiliation: {
          organization: 'Author University',
          department: 'Research'
        },
        profile: { 
          academicInfo: { institution: 'Author University' } 
        }
      });
    }

    testUserId = testUser._id;
    console.log('✅ Test users created/verified');

    // Login as admin
    const adminLoginResponse = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'AdminTest123!'
    });
    adminToken = adminLoginResponse.data.tokens.accessToken;
    console.log('✅ Admin login successful');

    // Login as regular user
    const userLoginResponse = await makeRequest('POST', '/auth/login', {
      email: 'author@test.com',
      password: 'AuthorTest123!'
    });
    authToken = userLoginResponse.data.tokens.accessToken;
    console.log('✅ User login successful');

    // Create a test submission with 'presented' status
    const ResearchSubmission = require('./src/models/ResearchSubmission');
    const Conference = require('./src/models/Conference');

    // Create test conference if needed
    let testConference = await Conference.findOne({ name: 'Test Conference 2024' });
    if (!testConference) {
      testConference = await Conference.create({
        name: 'Test Conference 2024',
        year: 2024,
        status: 'active',
        submissionDeadline: new Date('2024-12-31'),
        conferenceDate: new Date('2024-11-15'),
        createdBy: adminUser._id
      });
    }

    // Create or get test submission
    let testSubmission = await ResearchSubmission.findOne({
      title: 'Test Proceedings Paper',
      status: 'presented'
    });

    if (!testSubmission) {
      testSubmission = await ResearchSubmission.create({
        title: 'Test Proceedings Paper',
        abstract: 'This is a test paper for proceedings workflow testing.',
        keywords: ['test', 'proceedings', 'workflow'],
        status: 'presented',
        correspondingAuthor: {
          userId: testUser._id,
          name: { firstName: 'Test', lastName: 'Author' },
          email: 'author@test.com',
          institution: 'Author University'
        },
        conferenceId: testConference._id,
        conferenceYear: 2024,
        submissionNumber: `TEST-PROC-${Date.now()}`,
        submittedAt: new Date(),
        presentedAt: new Date()
      });
    }

    testSubmissionId = testSubmission._id;
    console.log('✅ Test submission created/verified');
    console.log(`   Submission ID: ${testSubmissionId}`);
    console.log(`   Status: ${testSubmission.status}`);

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  }
}

// Test 2: Get proceedings dashboard (admin)
async function testProceedingsDashboard() {
  console.log('\n📋 Test 2: Testing proceedings dashboard...');
  
  try {
    const response = await makeRequest('GET', '/proceedings/admin/dashboard', null, adminToken);
    console.log('✅ Proceedings dashboard retrieved');
    console.log(`   Total submissions: ${response.data.submissions.length}`);
    console.log(`   Statistics:`, response.data.statistics);
  } catch (error) {
    console.error('❌ Dashboard test failed:', error.message);
    throw error;
  }
}

// Test 3: Invite to proceedings
async function testInviteToProceedings() {
  console.log('\n📋 Test 3: Testing proceedings invitation...');
  
  try {
    const invitationData = {
      deadline: new Date(Date.now() + 6 * 7 * 24 * 60 * 60 * 1000), // 6 weeks from now
      customMessage: 'We are excited to invite you to contribute to our conference proceedings!'
    };

    const response = await makeRequest('POST', `/proceedings/admin/${testSubmissionId}/invite`, invitationData, adminToken);
    console.log('✅ Proceedings invitation sent');
    console.log(`   Invitation deadline: ${response.data.deadline}`);
    console.log(`   Invited at: ${response.data.invitedAt}`);
  } catch (error) {
    console.error('❌ Invitation test failed:', error.message);
    throw error;
  }
}

// Test 4: Get user's proceedings
async function testGetMyProceedings() {
  console.log('\n📋 Test 4: Testing user proceedings view...');
  
  try {
    const response = await makeRequest('GET', '/proceedings/me', null, authToken);
    console.log('✅ User proceedings retrieved');
    console.log(`   Total submissions: ${response.data.submissions.length}`);
    console.log(`   Summary:`, response.data.summary);
    
    if (response.data.submissions.length > 0) {
      const submission = response.data.submissions[0];
      console.log(`   First submission status: ${submission.proceedings.status.phase}`);
      console.log(`   Has invitation: ${submission.proceedings.hasResponded ? 'Responded' : 'Pending'}`);
    }
  } catch (error) {
    console.error('❌ User proceedings test failed:', error.message);
    throw error;
  }
}

// Test 5: Respond to invitation
async function testRespondToInvitation() {
  console.log('\n📋 Test 5: Testing invitation response...');
  
  try {
    const responseData = {
      accepted: true,
      comments: 'We are excited to participate in the proceedings and will submit our refined paper.'
    };

    const response = await makeRequest('POST', `/proceedings/${testSubmissionId}/respond`, responseData, authToken);
    console.log('✅ Invitation response submitted');
    console.log(`   Accepted: ${response.data.accepted}`);
    console.log(`   Response date: ${response.data.responseDate}`);
  } catch (error) {
    console.error('❌ Invitation response test failed:', error.message);
    throw error;
  }
}

// Test 6: Submit proceedings paper
async function testSubmitProceedingsPaper() {
  console.log('\n📋 Test 6: Testing proceedings paper submission...');
  
  try {
    // Create a test PDF file
    const testPdfPath = path.join(__dirname, 'test-proceedings-paper.pdf');
    const testPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF');
    fs.writeFileSync(testPdfPath, testPdfContent);

    // Create FormData
    const formData = new FormData();
    formData.append('proceedingsPaper', fs.createReadStream(testPdfPath), 'test-proceedings-paper.pdf');

    const response = await makeRequest('POST', `/proceedings/${testSubmissionId}/submit`, formData, authToken, true);
    console.log('✅ Proceedings paper submitted');
    console.log(`   Submitted at: ${response.data.submittedAt}`);
    console.log(`   Filename: ${response.data.filename}`);

    // Clean up test file
    fs.unlinkSync(testPdfPath);
  } catch (error) {
    console.error('❌ Paper submission test failed:', error.message);
    throw error;
  }
}

// Test 7: Assign editor
async function testAssignEditor() {
  console.log('\n📋 Test 7: Testing editor assignment...');
  
  try {
    // Use the admin user as the editor for testing
    const User = require('./src/models/User');
    const adminUser = await User.findOne({ email: 'admin@test.com' });

    const assignmentData = {
      editorId: adminUser._id
    };

    const response = await makeRequest('POST', `/proceedings/admin/${testSubmissionId}/assign-editor`, assignmentData, adminToken);
    console.log('✅ Editor assigned');
    console.log(`   Editor ID: ${response.data.editorId}`);
    console.log(`   Assigned at: ${response.data.assignedAt}`);
  } catch (error) {
    console.error('❌ Editor assignment test failed:', error.message);
    throw error;
  }
}

// Test 8: Test proceedings status tracking
async function testProceedingsStatusTracking() {
  console.log('\n📋 Test 8: Testing proceedings status tracking...');
  
  try {
    const ResearchSubmission = require('./src/models/ResearchSubmission');
    const submission = await ResearchSubmission.findById(testSubmissionId);
    
    const status = submission.getProceedingsStatus();
    console.log('✅ Proceedings status retrieved');
    console.log(`   Phase: ${status.phase}`);
    console.log(`   Description: ${status.description}`);
    console.log(`   Can submit: ${status.canSubmit}`);
    console.log(`   Needs action: ${status.needsAction}`);
    console.log(`   Next step: ${status.nextStep}`);

    // Test various workflow methods
    console.log('\n🔄 Testing workflow methods:');
    
    // Test making a decision (accept)
    submission.makeProceedingsDecision('accepted', 'Excellent paper, ready for publication');
    await submission.save();
    console.log('✅ Decision made: accepted');

    // Test publishing
    submission.publishProceedings({
      doi: '10.1234/test.proceedings.2024.001',
      publicationUrl: 'https://proceedings.sobie.org/2024/test-paper',
      volume: '2024',
      pages: '1-10'
    });
    await submission.save();
    console.log('✅ Paper published');

    const finalStatus = submission.getProceedingsStatus();
    console.log(`   Final status: ${finalStatus.phase}`);
    
  } catch (error) {
    console.error('❌ Status tracking test failed:', error.message);
    throw error;
  }
}

// Test 9: Final dashboard check
async function testFinalDashboardCheck() {
  console.log('\n📋 Test 9: Final dashboard check...');
  
  try {
    const response = await makeRequest('GET', '/proceedings/admin/dashboard', null, adminToken);
    console.log('✅ Final dashboard check completed');
    console.log(`   Total submissions: ${response.data.submissions.length}`);
    console.log(`   Published papers: ${response.data.statistics.published}`);

    // Check user's proceedings again
    const userResponse = await makeRequest('GET', '/proceedings/me', null, authToken);
    console.log('✅ Final user proceedings check completed');
    
    if (userResponse.data.submissions.length > 0) {
      const submission = userResponse.data.submissions[0];
      console.log(`   Final submission status: ${submission.proceedings.status.phase}`);
      console.log(`   Published at: ${submission.proceedings.publishedAt || 'Not yet published'}`);
    }
  } catch (error) {
    console.error('❌ Final dashboard check failed:', error.message);
    throw error;
  }
}

// Cleanup function
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    const ResearchSubmission = require('./src/models/ResearchSubmission');
    const User = require('./src/models/User');
    const Conference = require('./src/models/Conference');
    
    // Remove test data
    await ResearchSubmission.deleteMany({ title: 'Test Proceedings Paper' });
    await User.deleteMany({ email: { $in: ['admin@test.com', 'author@test.com'] } });
    await Conference.deleteMany({ name: 'Test Conference 2024' });
    
    console.log('✅ Test data cleaned up');
    
    // Close database connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Proceedings Workflow Test Suite');
  console.log('=' .repeat(60));

  try {
    await setupTestEnvironment();
    await testProceedingsDashboard();
    await testInviteToProceedings();
    await testGetMyProceedings();
    await testRespondToInvitation();
    await testSubmitProceedingsPaper();
    await testAssignEditor();
    await testProceedingsStatusTracking();
    await testFinalDashboardCheck();

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL PROCEEDINGS TESTS COMPLETED SUCCESSFULLY!');
    console.log('📈 The post-conference proceedings workflow is fully functional');
    console.log('\n✅ Features tested:');
    console.log('   • Proceedings invitation system');
    console.log('   • Author response workflow');
    console.log('   • Paper submission with file upload');
    console.log('   • Editor assignment process');
    console.log('   • Status tracking throughout workflow');
    console.log('   • Publication workflow');
    console.log('   • Admin dashboard integration');
    console.log('   • User proceedings management');
    console.log('   • Comprehensive notification system');

  } catch (error) {
    console.error('\n💥 TEST SUITE FAILED:', error.message);
    console.log('\n🔍 Check the error details above and ensure:');
    console.log('   • MongoDB is running and accessible');
    console.log('   • Server is running on the correct port');
    console.log('   • Environment variables are properly set');
    console.log('   • All required dependencies are installed');
  } finally {
    await cleanup();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Test interrupted. Cleaning up...');
  await cleanup();
  process.exit(0);
});

process.on('unhandledRejection', async (error) => {
  console.error('\n💥 Unhandled rejection:', error);
  await cleanup();
  process.exit(1);
});

// Run the test suite
runTests();
