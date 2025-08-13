#!/usr/bin/env node

/**
 * Research Submission System Test
 * Tests the complete research submission workflow including:
 * - Paper submission by authors
 * - Editor assignment by admin
 * - Reviewer assignment and review process
 * - Decision making and notifications
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Conference = require('../../src/models/Conference');
const ResearchSubmission = require('../../src/models/ResearchSubmission');
const emailService = require('../../src/services/emailService');

// Test data
  // Create test users
  const TEST_USERS = {
    admin: {
      email: 'admin@sobie.test',
      password: 'Password123!',
      name: { firstName: 'Admin', lastName: 'User' },
      userType: 'academic',
      roles: ['admin'],
      affiliation: { organization: 'SOBIE Organization' },
      profile: { expertiseAreas: ['administration', 'management'] }
    },
    editor: {
      email: 'editor@sobie.test', 
      password: 'Password123!',
      name: { firstName: 'Editor', lastName: 'User' },
      userType: 'academic',
      roles: ['editor'],
      affiliation: { organization: 'University of Testing' },
      profile: { expertiseAreas: ['finance', 'accounting'] }
    },
    reviewer1: {
      email: 'reviewer1@sobie.test',
      password: 'Password123!', 
      name: { firstName: 'Reviewer', lastName: 'One' },
      userType: 'academic',
      roles: ['reviewer'],
      affiliation: { organization: 'Review University' },
      profile: { expertiseAreas: ['finance', 'management'] }
    },
    reviewer2: {
      email: 'reviewer2@sobie.test',
      password: 'Password123!',
      name: { firstName: 'Reviewer', lastName: 'Two' },
      userType: 'academic', 
      roles: ['reviewer'],
      affiliation: { organization: 'Academic Institute' },
      profile: { expertiseAreas: ['accounting', 'finance'] }
    },
    author: {
      email: 'author@sobie.test',
      password: 'Password123!',
      name: { firstName: 'Research', lastName: 'Author' },
      userType: 'academic',
      roles: ['user'],
      affiliation: { organization: 'Research University' },
      profile: { expertiseAreas: ['technology', 'innovation'] }
    },
    coauthor: {
      email: 'coauthor@sobie.test',
      password: 'Password123!',
      name: { firstName: 'Co', lastName: 'Author' },
      userType: 'student',
      studentLevel: 'graduate',
      roles: ['user'],
      affiliation: { organization: 'Graduate School' },
      profile: { expertiseAreas: ['data science', 'analytics'] }
    }
  };

async function setupTestData() {
  console.log('🔧 Setting up test data...');

  // Create test users
  const createdUsers = {};
  for (const [key, userData] of Object.entries(TEST_USERS)) {
    try {
      // Delete existing user if exists
      await User.deleteOne({ email: userData.email });
      
      const user = new User({
        ...userData,
        isEmailVerified: true,
        isActive: true
      });
      await user.save();
      createdUsers[key] = user;
      console.log(`   ✅ Created ${key}: ${userData.email}`);
    } catch (error) {
      console.error(`   ❌ Failed to create ${key}:`, error.message);
    }
  }

  // Create test conference
  const conferenceData = {
    name: 'SOBIE Research Test Conference',
    fullName: 'SOBIE Research Test Conference 2026',
    year: 2026,
    edition: '2026 Test Edition',
    startDate: new Date('2026-10-15'),
    endDate: new Date('2026-10-17'),
    location: {
      venue: 'Test University',
      city: 'Test City',
      state: 'Test State',
      country: 'USA'
    },
    submissionDeadline: new Date('2026-09-01'),
    isActive: true,
    editorEmails: [createdUsers.admin.email, createdUsers.editor.email]
  };

  await Conference.deleteOne({ year: conferenceData.year });
  const conference = new Conference(conferenceData);
  await conference.save();
  console.log(`   ✅ Created conference: ${conference.name}`);

  return { users: createdUsers, conference };
}

async function testSubmissionWorkflow() {
  console.log('\n📝 Testing Research Submission Workflow...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');

    // Setup test data
    const { users, conference } = await setupTestData();

    // Step 1: Author creates submission
    console.log('\n📋 Step 1: Author creates research submission');
    const submissionData = {
      title: 'The Impact of Digital Transformation on Financial Performance: A Comprehensive Analysis',
      abstract: 'This study examines the relationship between digital transformation initiatives and financial performance metrics across various industries. Using a mixed-methods approach, we analyze data from 500 companies over a five-year period to understand how digital transformation affects revenue growth, cost efficiency, and market competitiveness. Our findings suggest that companies with comprehensive digital strategies outperform their traditional counterparts by an average of 23% in revenue growth and 18% in cost reduction. The research contributes to the growing body of literature on digital transformation and provides practical insights for executives and policy makers.',
      keywords: ['digital transformation', 'financial performance', 'mixed methods', 'revenue growth', 'cost efficiency'],
      conferenceId: conference._id,
      conferenceYear: conference.year,
      researchType: 'empirical',
      presentationType: 'paper',
      discipline: 'finance',
      academicLevel: 'faculty',
      paperUpload: {
        filename: 'test-research-paper.pdf',
        originalName: 'Digital Transformation Financial Performance Analysis.pdf',
        path: 'uploads/research/test-research-paper.pdf',
        size: 1024000, // 1MB
        uploadDate: new Date()
      },
      correspondingAuthor: {
        name: {
          firstName: users.author.name.firstName,
          lastName: users.author.name.lastName,
          title: 'Dr.'
        },
        email: users.author.email,
        phone: '+1-555-0123',
        affiliation: {
          institution: users.author.affiliation.organization,
          department: 'Finance Department',
          address: {
            city: 'Test City',
            state: 'Test State',
            country: 'USA'
          }
        },
        userId: users.author._id
      },
      coAuthors: [{
        name: {
          firstName: users.coauthor.name.firstName,
          lastName: users.coauthor.name.lastName,
          title: 'Ms.'
        },
        email: users.coauthor.email,
        affiliation: {
          institution: users.coauthor.affiliation.organization,
          department: 'Graduate School'
        },
        role: 'student_researcher',
        isStudentAuthor: true,
        userId: users.coauthor._id,
        order: 2
      }],
      researchDetails: {
        methodology: 'Mixed-methods analysis combining quantitative financial data with qualitative interviews',
        dataSource: 'Public company financial statements and executive interviews',
        sampleSize: 500,
        analysisMethod: ['regression analysis', 'factor analysis', 'thematic analysis'],
        keyFindings: [
          '23% average revenue growth improvement',
          '18% cost reduction on average',
          'Digital strategy comprehensiveness is key success factor'
        ],
        contributions: [
          'First comprehensive study across multiple industries',
          'Mixed-methods approach provides deeper insights',
          'Practical framework for digital transformation assessment'
        ],
        limitations: [
          'Limited to publicly traded companies',
          'Five-year observation period may not capture long-term effects'
        ]
      }
    };

    const submission = new ResearchSubmission(submissionData);
    await submission.save();
    console.log(`   ✅ Created submission: ${submission.submissionNumber}`);
    console.log(`   📄 Title: ${submission.title}`);
    console.log(`   👤 Corresponding Author: ${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`);
    console.log(`   👥 Co-Authors: ${submission.coAuthors.length}`);

    // Simulate paper upload
    submission.paperUpload = {
      filename: 'digital-transformation-research.pdf',
      originalName: 'Digital Transformation Research Paper.pdf',
      filePath: '/uploads/research/digital-transformation-research.pdf',
      fileSize: 2048576, // 2MB
      uploadDate: new Date()
    };
    await submission.save();
    console.log(`   📎 Paper uploaded: ${submission.paperUpload.originalName}`);

    // Submit for review
    submission.status = 'submitted';
    submission.initialSubmissionDate = new Date();
    await submission.save();
    console.log(`   🚀 Submitted for review on: ${submission.initialSubmissionDate.toLocaleDateString()}`);

    // Step 2: Admin assigns editor
    console.log('\n🎯 Step 2: Admin assigns editor');
    submission.assignEditor(users.editor._id, 'Assigned based on expertise in finance and digital transformation');
    await submission.save();
    console.log(`   ✅ Editor assigned: ${users.editor.name.firstName} ${users.editor.name.lastName}`);
    console.log(`   📅 Assignment date: ${submission.reviewWorkflow.editor.assignedDate.toLocaleDateString()}`);

    // Send editor notification email
    await emailService.sendEditorAssignmentNotification(
      users.editor.email,
      {
        editorName: `${users.editor.name.firstName} ${users.editor.name.lastName}`,
        title: submission.title,
        authorName: submission.authorList,
        submissionNumber: submission.submissionNumber,
        discipline: submission.discipline,
        abstractPreview: submission.abstract.substring(0, 300) + '...'
      }
    );
    console.log(`   📧 Editor notification sent to: ${users.editor.email}`);

    // Step 3: Editor assigns reviewers
    console.log('\n👥 Step 3: Editor assigns reviewers');
    const reviewDeadline = new Date();
    reviewDeadline.setDate(reviewDeadline.getDate() + 14); // 2 weeks from now

    submission.reviewWorkflow.reviewDeadline = reviewDeadline;
    submission.addReviewer(users.reviewer1._id);
    submission.addReviewer(users.reviewer2._id);
    await submission.save();
    
    console.log(`   ✅ Reviewers assigned: 2`);
    console.log(`   👤 Reviewer 1: ${users.reviewer1.name.firstName} ${users.reviewer1.name.lastName} (${users.reviewer1.email})`);
    console.log(`   👤 Reviewer 2: ${users.reviewer2.name.firstName} ${users.reviewer2.name.lastName} (${users.reviewer2.email})`);
    console.log(`   ⏰ Review deadline: ${reviewDeadline.toLocaleDateString()}`);

    // Send reviewer invitations
    for (const reviewer of [users.reviewer1, users.reviewer2]) {
      await emailService.sendReviewInvitation(
        reviewer.email,
        {
          reviewerName: `${reviewer.name.firstName} ${reviewer.name.lastName}`,
          title: submission.title,
          authorName: submission.authorList,
          submissionNumber: submission.submissionNumber,
          discipline: submission.discipline,
          deadline: reviewDeadline,
          abstractPreview: submission.abstract.substring(0, 300) + '...',
          acceptUrl: `${process.env.FRONTEND_URL}/review/${submission._id}/accept`,
          declineUrl: `${process.env.FRONTEND_URL}/review/${submission._id}/decline`
        }
      );
      console.log(`   📧 Review invitation sent to: ${reviewer.email}`);
    }

    // Step 4: Reviewers accept invitations
    console.log('\n✅ Step 4: Reviewers accept invitations');
    submission.acceptReview(users.reviewer1._id);
    submission.acceptReview(users.reviewer2._id);
    await submission.save();
    console.log(`   ✅ Reviewer 1 accepted invitation`);
    console.log(`   ✅ Reviewer 2 accepted invitation`);

    // Step 5: Reviewers submit reviews
    console.log('\n📝 Step 5: Reviewers submit reviews');
    
    // Reviewer 1 review
    const review1Data = {
      overallScore: 4,
      recommendation: 'minor_revision',
      criteria: {
        relevance: { score: 5, comments: 'Highly relevant to current business challenges' },
        methodology: { score: 4, comments: 'Sound methodology, but could benefit from larger sample' },
        originality: { score: 4, comments: 'Novel application of mixed-methods approach' },
        clarity: { score: 3, comments: 'Generally clear but some sections need restructuring' },
        significance: { score: 4, comments: 'Significant practical implications for businesses' }
      },
      confidentialComments: 'Overall a strong paper. The methodology is sound and the findings are significant. Minor revisions to improve clarity would strengthen the contribution.',
      authorComments: 'This is a well-executed study with practical implications. I recommend minor revisions to improve the clarity of the results section and strengthen the theoretical framework discussion.'
    };

    submission.submitReview(users.reviewer1._id, review1Data);
    console.log(`   ✅ Reviewer 1 submitted review: ${review1Data.recommendation} (Score: ${review1Data.overallScore}/5)`);

    // Reviewer 2 review
    const review2Data = {
      overallScore: 4,
      recommendation: 'accept',
      criteria: {
        relevance: { score: 5, comments: 'Extremely relevant to conference theme' },
        methodology: { score: 4, comments: 'Robust mixed-methods design' },
        originality: { score: 5, comments: 'First comprehensive cross-industry analysis' },
        clarity: { score: 4, comments: 'Well-written and easy to follow' },
        significance: { score: 5, comments: 'High impact for both academia and practice' }
      },
      confidentialComments: 'Excellent paper that makes a significant contribution to the field. The cross-industry analysis is particularly valuable.',
      authorComments: 'This is an excellent contribution to the digital transformation literature. The mixed-methods approach provides valuable insights that neither quantitative nor qualitative methods alone could achieve. I recommend acceptance with minor editorial changes.'
    };

    submission.submitReview(users.reviewer2._id, review2Data);
    console.log(`   ✅ Reviewer 2 submitted review: ${review2Data.recommendation} (Score: ${review2Data.overallScore}/5)`);

    await submission.save();

    // Notify editor that all reviews are complete
    await emailService.sendReviewsCompleteNotification(
      users.editor.email,
      {
        editorName: `${users.editor.name.firstName} ${users.editor.name.lastName}`,
        title: submission.title,
        submissionNumber: submission.submissionNumber,
        reviewCount: 2
      }
    );
    console.log(`   📧 Reviews complete notification sent to editor`);

    // Step 6: Editor makes final decision
    console.log('\n⚖️ Step 6: Editor makes final decision');
    const editorComments = 'Based on the reviewer feedback, this paper makes a valuable contribution to our understanding of digital transformation. The reviewers have identified minor revisions that will strengthen the paper. Please address their comments and resubmit.';
    
    submission.makeDecision('minor_revision', editorComments);
    await submission.save();
    console.log(`   ✅ Decision made: ${submission.reviewWorkflow.finalDecision.decision}`);
    console.log(`   📅 Decision date: ${submission.reviewWorkflow.finalDecision.decisionDate.toLocaleDateString()}`);

    // Send decision notification to author
    const completedReviews = submission.reviewWorkflow.reviewers.filter(r => r.status === 'completed');
    await emailService.sendDecisionNotification(
      submission.correspondingAuthor.email,
      {
        authorName: `${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`,
        title: submission.title,
        submissionNumber: submission.submissionNumber,
        decision: submission.reviewWorkflow.finalDecision.decision,
        editorComments: editorComments,
        reviews: completedReviews.map(r => ({
          overallScore: r.review.overallScore,
          recommendation: r.review.recommendation,
          authorComments: r.review.authorComments
        }))
      }
    );
    console.log(`   📧 Decision notification sent to author`);

    // Step 7: Display submission status and statistics
    console.log('\n📊 Step 7: Submission Status Summary');
    const finalSubmission = await ResearchSubmission.findById(submission._id)
      .populate('correspondingAuthor.userId', 'name email')
      .populate('coAuthors.userId', 'name email')
      .populate('reviewWorkflow.editor.userId', 'name email')
      .populate('reviewWorkflow.reviewers.userId', 'name email');

    console.log(`\n📋 SUBMISSION SUMMARY`);
    console.log(`====================`);
    console.log(`Submission Number: ${finalSubmission.submissionNumber}`);
    console.log(`Title: ${finalSubmission.title}`);
    console.log(`Status: ${finalSubmission.status.toUpperCase()}`);
    console.log(`Discipline: ${finalSubmission.discipline}`);
    console.log(`Academic Level: ${finalSubmission.academicLevel}`);
    console.log(`Research Type: ${finalSubmission.researchType}`);
    
    console.log(`\n👥 AUTHORS`);
    console.log(`Corresponding Author: ${finalSubmission.correspondingAuthor.name.firstName} ${finalSubmission.correspondingAuthor.name.lastName} (${finalSubmission.correspondingAuthor.email})`);
    finalSubmission.coAuthors.forEach((author, index) => {
      console.log(`Co-Author ${index + 1}: ${author.name.firstName} ${author.name.lastName} (${author.email})`);
    });

    console.log(`\n🎯 EDITORIAL WORKFLOW`);
    if (finalSubmission.reviewWorkflow.editor.userId) {
      console.log(`Editor: ${finalSubmission.reviewWorkflow.editor.userId.name.firstName} ${finalSubmission.reviewWorkflow.editor.userId.name.lastName}`);
      console.log(`Editor Assigned: ${finalSubmission.reviewWorkflow.editor.assignedDate.toLocaleDateString()}`);
    }

    console.log(`\n👥 REVIEWERS`);
    finalSubmission.reviewWorkflow.reviewers.forEach((reviewer, index) => {
      console.log(`Reviewer ${index + 1}: ${reviewer.userId.name.firstName} ${reviewer.userId.name.lastName}`);
      console.log(`  Status: ${reviewer.status}`);
      if (reviewer.review) {
        console.log(`  Score: ${reviewer.review.overallScore}/5`);
        console.log(`  Recommendation: ${reviewer.review.recommendation}`);
        console.log(`  Review Date: ${reviewer.review.reviewDate.toLocaleDateString()}`);
      }
    });

    console.log(`\n⚖️ FINAL DECISION`);
    console.log(`Decision: ${finalSubmission.reviewWorkflow.finalDecision.decision.toUpperCase()}`);
    console.log(`Decision Date: ${finalSubmission.reviewWorkflow.finalDecision.decisionDate.toLocaleDateString()}`);
    console.log(`Editor Comments: ${finalSubmission.reviewWorkflow.finalDecision.editorComments}`);

    console.log(`\n📈 STATISTICS`);
    console.log(`Days Since Submission: ${finalSubmission.daysSinceSubmission}`);
    console.log(`Review Status: ${finalSubmission.reviewStatus.phase}`);
    console.log(`Review Completion Rate: ${finalSubmission.reviewStatus.completionRate}%`);
    console.log(`Associated Users: ${finalSubmission.associatedUsers.length}`);
    console.log(`Notifications Sent: ${finalSubmission.notifications.length}`);

    console.log(`\n✅ Research submission workflow test completed successfully!`);
    
    // Test notification preferences
    console.log(`\n🔔 Testing notification preferences...`);
    const userSubmissions = await ResearchSubmission.getByUser(users.author._id);
    console.log(`   ✅ Found ${userSubmissions.length} submissions for author`);
    
    const reviewerSubmissions = await ResearchSubmission.getForReviewer(users.reviewer1._id);
    console.log(`   ✅ Found ${reviewerSubmissions.length} submissions for reviewer 1`);
    
    const editorSubmissions = await ResearchSubmission.getForEditor(users.editor._id);
    console.log(`   ✅ Found ${editorSubmissions.length} submissions for editor`);

    return {
      submission: finalSubmission,
      users,
      conference
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

async function testAdminFunctions() {
  console.log('\n🔧 Testing Admin Functions...');
  
  try {
    // Test potential reviewers query
    const testSubmission = await ResearchSubmission.findOne({});
    if (testSubmission) {
      const authorInstitutions = [
        testSubmission.correspondingAuthor.affiliation.institution,
        ...testSubmission.coAuthors.map(author => author.affiliation.institution)
      ];

      const potentialReviewers = await User.find({
        $or: [
          { roles: 'reviewer' },
          { roles: 'editor' },
          { roles: 'admin' }
        ],
        _id: { 
          $nin: [
            testSubmission.correspondingAuthor.userId,
            ...testSubmission.coAuthors.map(author => author.userId).filter(Boolean)
          ]
        }
      }).select('name email affiliation profile roles');

      console.log(`   ✅ Found ${potentialReviewers.length} potential reviewers`);
      
      // Check for conflicts
      const conflicts = potentialReviewers.filter(reviewer => 
        reviewer.affiliation && 
        authorInstitutions.includes(reviewer.affiliation.organization)
      );
      console.log(`   ⚠️ Found ${conflicts.length} potential conflicts of interest`);
    }

    // Test statistics
    const stats = await ResearchSubmission.aggregate([
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          byStatus: {
            $push: {
              status: '$status',
              discipline: '$discipline',
              isStudentResearch: '$isStudentResearch'
            }
          }
        }
      }
    ]);

    if (stats.length > 0) {
      console.log(`   📊 Total submissions in system: ${stats[0].totalSubmissions}`);
      
      const statusBreakdown = {};
      stats[0].byStatus.forEach(item => {
        statusBreakdown[item.status] = (statusBreakdown[item.status] || 0) + 1;
      });
      
      console.log(`   📈 Status breakdown:`, statusBreakdown);
    }

  } catch (error) {
    console.error('❌ Admin function test failed:', error);
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Remove test submissions
    const deleteResult = await ResearchSubmission.deleteMany({
      title: { $regex: 'Digital Transformation', $options: 'i' }
    });
    console.log(`   🗑️ Deleted ${deleteResult.deletedCount} test submissions`);

    // Remove test conference
    await Conference.deleteOne({ year: 2026 });
    console.log(`   🗑️ Deleted test conference`);

    // Note: Keep test users for potential future testing
    console.log(`   ℹ️ Test users retained for future testing`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Main execution
async function main() {
  try {
    const testResult = await testSubmissionWorkflow();
    await testAdminFunctions();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Research submission creation');
    console.log('   ✅ Paper upload simulation');
    console.log('   ✅ Editor assignment');
    console.log('   ✅ Reviewer assignment');
    console.log('   ✅ Review process');
    console.log('   ✅ Decision making');
    console.log('   ✅ Email notifications');
    console.log('   ✅ Status tracking');
    console.log('   ✅ Admin functions');
    
    // Ask user if they want to clean up
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\n🤔 Do you want to clean up test data? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await cleanup();
      } else {
        console.log('   ℹ️ Test data retained');
      }
      
      rl.close();
      await mongoose.disconnect();
      console.log('📊 Disconnected from MongoDB');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main();
}

module.exports = { testSubmissionWorkflow, testAdminFunctions, cleanup };
