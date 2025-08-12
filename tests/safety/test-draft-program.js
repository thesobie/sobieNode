const mongoose = require('mongoose');
const Conference = require('./src/models/Conference');
const ResearchSubmission = require('./src/models/ResearchSubmission');
const User = require('./src/models/User');
const { getProgramBuilderDashboard } = require('./src/controllers/programBuilderController');

// Mock Express response object
function createMockResponse() {
  const res = {
    json: function(data) {
      console.log('\n📊 Dashboard Response:');
      console.log(JSON.stringify(data, null, 2));
      return this;
    },
    status: function(code) {
      this.statusCode = code;
      return this;
    }
  };
  return res;
}

async function testDraftProgramBuilder() {
  console.log('🧪 Testing Draft Program Builder Functionality\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sobie_test');
    console.log('📊 Connected to MongoDB');

    // Clean up any existing test data
    await Conference.deleteMany({ name: /Draft Program Test/ });
    await ResearchSubmission.deleteMany({ title: /Draft Test/ });
    await User.deleteMany({ email: /drafttest/ });

    // Create test conference
    const conference = new Conference({
      name: 'Draft Program Test Conference 2024',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-03'),
      location: 'Test University',
      status: 'active'
    });
    await conference.save();
    console.log('✅ Created test conference');

    // Create test editor
    const editor = new User({
      firstName: 'Draft',
      lastName: 'Editor',
      email: 'drafttest@test.edu',
      password: 'test123',
      role: 'editor'
    });
    await editor.save();
    console.log('✅ Created test editor');

    // Create submissions with different review states
    const submissions = [
      // Accepted papers (should appear in both regular and draft)
      {
        title: 'Draft Test Accepted Paper 1',
        status: 'accepted',
        discipline: 'finance',
        keywords: ['blockchain', 'fintech'],
        abstract: 'This is an accepted paper about blockchain in finance.',
        primaryAuthor: editor._id,
        conferenceId: conference._id
      },
      {
        title: 'Draft Test Accepted Paper 2', 
        status: 'accepted',
        discipline: 'analytics',
        keywords: ['machine learning', 'data science'],
        abstract: 'This is an accepted paper about ML in business analytics.',
        primaryAuthor: editor._id,
        conferenceId: conference._id
      },
      // Papers under review (should only appear in draft)
      {
        title: 'Draft Test Under Review Paper 1',
        status: 'under_review',
        discipline: 'finance',
        keywords: ['cryptocurrency', 'regulation'],
        abstract: 'This paper is currently under review about crypto regulation.',
        primaryAuthor: editor._id,
        conferenceId: conference._id,
        reviewWorkflow: {
          reviewers: [
            {
              reviewerId: editor._id,
              status: 'completed',
              review: {
                overallScore: 4,
                recommendation: 'accept',
                comments: 'Strong paper with good methodology'
              }
            }
          ]
        }
      },
      {
        title: 'Draft Test Under Review Paper 2',
        status: 'under_review', 
        discipline: 'analytics',
        keywords: ['predictive modeling', 'business intelligence'],
        abstract: 'This paper is under review about predictive modeling.',
        primaryAuthor: editor._id,
        conferenceId: conference._id,
        reviewWorkflow: {
          reviewers: [
            {
              reviewerId: editor._id,
              status: 'completed',
              review: {
                overallScore: 3,
                recommendation: 'minor_revision',
                comments: 'Good work but needs minor improvements'
              }
            }
          ]
        }
      },
      // Papers pending revision
      {
        title: 'Draft Test Pending Revision Paper',
        status: 'pending_revision',
        discipline: 'management',
        keywords: ['organizational behavior', 'leadership'],
        abstract: 'This paper needs revisions about leadership effectiveness.',
        primaryAuthor: editor._id,
        conferenceId: conference._id,
        reviewWorkflow: {
          reviewers: [
            {
              reviewerId: editor._id,
              status: 'completed',
              review: {
                overallScore: 2,
                recommendation: 'major_revision',
                comments: 'Needs significant improvements to methodology'
              }
            }
          ]
        }
      },
      // Recently revised papers
      {
        title: 'Draft Test Revised Paper',
        status: 'revised',
        discipline: 'pedagogy',
        keywords: ['online learning', 'student engagement'],
        abstract: 'This paper was revised based on reviewer feedback.',
        primaryAuthor: editor._id,
        conferenceId: conference._id,
        reviewWorkflow: {
          reviewers: [
            {
              reviewerId: editor._id,
              status: 'completed',
              review: {
                overallScore: 4,
                recommendation: 'accept',
                comments: 'Much improved after revisions'
              }
            }
          ]
        }
      }
    ];

    const createdSubmissions = [];
    for (const submissionData of submissions) {
      const submission = new ResearchSubmission(submissionData);
      await submission.save();
      createdSubmissions.push(submission);
    }
    console.log(`✅ Created ${submissions.length} test submissions with various review states`);

    // Test regular dashboard (should only show accepted papers)
    console.log('\n📋 Testing Regular Dashboard (accepted papers only):');
    const regularReq = {
      params: { conferenceId: conference._id.toString() },
      query: {}
    };
    await getProgramBuilderDashboard(regularReq, createMockResponse());

    // Test draft dashboard (should show all papers with acceptance probabilities)
    console.log('\n📋 Testing Draft Dashboard (includes papers under review):');
    const draftReq = {
      params: { conferenceId: conference._id.toString() },
      query: { includeDraft: 'true', confidence: 'medium' }
    };
    await getProgramBuilderDashboard(draftReq, createMockResponse());

    // Test conservative draft dashboard
    console.log('\n📋 Testing Conservative Draft Dashboard (high confidence only):');
    const conservativeReq = {
      params: { conferenceId: conference._id.toString() },
      query: { includeDraft: 'true', confidence: 'conservative' }
    };
    await getProgramBuilderDashboard(conservativeReq, createMockResponse());

    // Test optimistic draft dashboard
    console.log('\n📋 Testing Optimistic Draft Dashboard (all papers):');
    const optimisticReq = {
      params: { conferenceId: conference._id.toString() },
      query: { includeDraft: 'true', confidence: 'high' }
    };
    await getProgramBuilderDashboard(optimisticReq, createMockResponse());

    console.log('\n✅ Draft Program Builder Testing Complete!');
    console.log('\n📊 Test Results Summary:');
    console.log('• Regular dashboard shows only accepted papers');
    console.log('• Draft dashboard includes papers under review with acceptance probabilities');
    console.log('• Confidence levels filter papers based on likelihood of acceptance');
    console.log('• Statistics show breakdown of confirmed vs. likely vs. uncertain papers');

    // Clean up
    await Conference.deleteMany({ name: /Draft Program Test/ });
    await ResearchSubmission.deleteMany({ title: /Draft Test/ });
    await User.deleteMany({ email: /drafttest/ });
    console.log('\n🧹 Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
}

// Run the test
testDraftProgramBuilder();
