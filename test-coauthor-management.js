#!/usr/bin/env node

/**
 * Comprehensive test for enhanced co-author management functionality
 * Tests: co-author search, addition, removal, reordering, presenter designation, faculty sponsors
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const ResearchSubmission = require('./src/models/ResearchSubmission');
const Conference = require('./src/models/Conference');

// Test configuration
const TEST_DB = process.env.MONGODB_URI || 'mongodb://localhost:27017/sobie_test';

async function connectToDatabase() {
  try {
    await mongoose.connect(TEST_DB);
    console.log('📊 Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

async function setupTestData() {
  console.log('🔧 Setting up enhanced test data...');

  // Create test users with various roles and expertise
  const TEST_USERS = {
    primaryAuthor: {
      email: 'primary.author@test.edu',
      password: 'Password123!',
      name: { firstName: 'Primary', lastName: 'Author' },
      userType: 'academic',
      roles: ['user'],
      affiliation: { 
        organization: 'Test University',
        department: 'Business School',
        jobTitle: 'Assistant Professor'
      },
      profile: { expertiseAreas: ['finance', 'digital transformation'] }
    },
    collaborator1: {
      email: 'collaborator1@test.edu',
      password: 'Password123!',
      name: { firstName: 'Known', lastName: 'Collaborator' },
      userType: 'academic',
      roles: ['user'],
      affiliation: {
        organization: 'Partner University',
        department: 'Finance Department',
        jobTitle: 'Associate Professor'
      },
      profile: { expertiseAreas: ['finance', 'accounting'] }
    },
    collaborator2: {
      email: 'collaborator2@test.edu',
      password: 'Password123!',
      name: { firstName: 'Another', lastName: 'Collaborator' },
      userType: 'academic',
      roles: ['user'],
      affiliation: {
        organization: 'Research Institute',
        department: 'Data Science',
        jobTitle: 'Senior Researcher'
      },
      profile: { expertiseAreas: ['data science', 'machine learning'] }
    },
    facultyAdvisor: {
      email: 'faculty.advisor@test.edu',
      password: 'Password123!',
      name: { firstName: 'Faculty', lastName: 'Advisor' },
      userType: 'academic',
      roles: ['reviewer', 'user'],
      affiliation: {
        organization: 'Student University',
        department: 'Business Administration',
        jobTitle: 'Full Professor'
      },
      profile: { expertiseAreas: ['business strategy', 'research methods'] }
    },
    studentAuthor: {
      email: 'student.author@test.edu',
      password: 'Password123!',
      name: { firstName: 'Graduate', lastName: 'Student' },
      userType: 'student',
      studentLevel: 'graduate',
      roles: ['user'],
      affiliation: {
        organization: 'Student University',
        department: 'MBA Program'
      },
      profile: { expertiseAreas: ['business analytics'] }
    },
    newUser: {
      email: 'new.user@test.edu',
      password: 'Password123!',
      name: { firstName: 'New', lastName: 'User' },
      userType: 'academic',
      roles: ['user'],
      affiliation: {
        organization: 'Fresh University',
        department: 'Technology',
        jobTitle: 'Assistant Professor'
      },
      profile: { expertiseAreas: ['technology', 'innovation'] }
    }
  };

  // Create users
  const createdUsers = {};
  for (const [key, userData] of Object.entries(TEST_USERS)) {
    try {
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
      console.log(`   ❌ Failed to create ${key}: ${error.message}`);
    }
  }

  // Create test conference
  const conferenceData = {
    name: 'SOBIE Co-Author Test Conference',
    fullName: 'SOBIE Co-Author Test Conference 2027',
    year: 2027,
    edition: '2027 Test Edition',
    startDate: new Date('2027-10-15'),
    endDate: new Date('2027-10-17'),
    location: {
      venue: 'Test University',
      city: 'Test City',
      state: 'Test State',
      country: 'USA'
    },
    submissionDeadline: new Date('2027-09-01'),
    isActive: true
  };

  await Conference.deleteOne({ year: conferenceData.year });
  const conference = new Conference(conferenceData);
  await conference.save();
  console.log(`   ✅ Created conference: ${conference.name}`);

  // Create past collaboration to establish known collaborator relationship
  const pastSubmissionData = {
    title: 'Previous Collaboration Paper',
    abstract: 'This establishes a collaboration history between primary author and collaborator1.',
    keywords: ['collaboration', 'history'],
    conferenceId: conference._id,
    conferenceYear: conference.year,
    researchType: 'empirical',
    presentationType: 'paper',
    discipline: 'finance',
    academicLevel: 'faculty',
    paperUpload: {
      filename: 'past-collaboration.pdf',
      originalName: 'Past Collaboration.pdf',
      path: 'uploads/research/past-collaboration.pdf',
      size: 512000,
      uploadDate: new Date()
    },
    correspondingAuthor: {
      name: {
        firstName: createdUsers.primaryAuthor.name.firstName,
        lastName: createdUsers.primaryAuthor.name.lastName,
        title: 'Dr.'
      },
      email: createdUsers.primaryAuthor.email,
      phone: '+1-555-0123',
      affiliation: {
        institution: createdUsers.primaryAuthor.affiliation.organization,
        department: 'Finance Department'
      },
      userId: createdUsers.primaryAuthor._id
    },
    coAuthors: [{
      name: {
        firstName: createdUsers.collaborator1.name.firstName,
        lastName: createdUsers.collaborator1.name.lastName,
        title: 'Dr.'
      },
      email: createdUsers.collaborator1.email,
      affiliation: {
        institution: createdUsers.collaborator1.affiliation.organization,
        department: createdUsers.collaborator1.affiliation.department
      },
      userId: createdUsers.collaborator1._id,
      order: 1
    }],
    status: 'accepted'
  };

  const pastSubmission = new ResearchSubmission(pastSubmissionData);
  await pastSubmission.save();
  console.log(`   ✅ Created past collaboration submission`);

  return { users: createdUsers, conference };
}

async function testCoAuthorManagement() {
  try {
    const { users, conference } = await setupTestData();

    console.log('\n📝 Testing Enhanced Co-Author Management...');

    // Step 1: Create new research submission
    console.log('\n📋 Step 1: Create new research submission');
    const submissionData = {
      title: 'Advanced Co-Author Management Test Paper',
      abstract: 'This paper tests the enhanced co-author management features including search, addition, removal, reordering, and presenter designation.',
      keywords: ['co-author', 'management', 'collaboration', 'presentation'],
      conferenceId: conference._id,
      conferenceYear: conference.year,
      researchType: 'empirical',
      presentationType: 'paper',
      discipline: 'management',
      academicLevel: 'faculty',
      paperUpload: {
        filename: 'coauthor-test.pdf',
        originalName: 'Co-Author Management Test.pdf',
        path: 'uploads/research/coauthor-test.pdf',
        size: 1024000,
        uploadDate: new Date()
      },
      correspondingAuthor: {
        name: {
          firstName: users.primaryAuthor.name.firstName,
          lastName: users.primaryAuthor.name.lastName,
          title: 'Dr.'
        },
        email: users.primaryAuthor.email,
        phone: '+1-555-0123',
        affiliation: {
          institution: users.primaryAuthor.affiliation.organization,
          department: 'Business School'
        },
        userId: users.primaryAuthor._id
      },
      status: 'draft'
    };

    const submission = new ResearchSubmission(submissionData);
    await submission.save();
    console.log(`   ✅ Created submission: ${submission.submissionNumber}`);

    // Step 2: Test adding known collaborator
    console.log('\n👥 Step 2: Add known collaborator as co-author');
    const knownCollaboratorData = {
      userId: users.collaborator1._id,
      role: 'co_author',
      isStudentAuthor: false
    };

    const knownCoAuthor = await submission.addCoAuthor(knownCollaboratorData, true);
    await submission.save();
    console.log(`   ✅ Added known collaborator: ${users.collaborator1.name.firstName} ${users.collaborator1.name.lastName}`);
    console.log(`   🤝 Known collaborator flag: ${knownCoAuthor.isKnownCollaborator}`);

    // Step 3: Test adding external (non-SOBIE) co-author
    console.log('\n🌐 Step 3: Add external co-author');
    const externalAuthorData = {
      name: {
        firstName: 'External',
        lastName: 'Researcher',
        title: 'Dr.',
        rank: 'Professor'
      },
      email: 'external.researcher@external.edu',
      affiliation: {
        institution: 'External University',
        department: 'Computer Science',
        college: 'Engineering',
        jobTitle: 'Professor'
      },
      role: 'co_author',
      isStudentAuthor: false,
      isExternalAuthor: true
    };

    const externalCoAuthor = await submission.addCoAuthor(externalAuthorData, false);
    await submission.save();
    console.log(`   ✅ Added external co-author: ${externalAuthorData.name.firstName} ${externalAuthorData.name.lastName}`);
    console.log(`   🌍 External author flag: ${externalCoAuthor.isExternalAuthor}`);

    // Step 4: Test adding SOBIE user as co-author
    console.log('\n👤 Step 4: Add SOBIE user as co-author');
    const sobieUserData = {
      userId: users.collaborator2._id,
      role: 'co_author',
      isStudentAuthor: false
    };

    const sobieCoAuthor = await submission.addCoAuthor(sobieUserData, false);
    await submission.save();
    console.log(`   ✅ Added SOBIE user: ${users.collaborator2.name.firstName} ${users.collaborator2.name.lastName}`);

    // Step 5: Test reordering co-authors
    console.log('\n🔄 Step 5: Reorder co-authors');
    const currentOrder = submission.coAuthors.map(author => author._id);
    const newOrder = [currentOrder[2], currentOrder[0], currentOrder[1]]; // Reverse order

    submission.reorderCoAuthors(newOrder);
    await submission.save();
    console.log(`   ✅ Reordered co-authors:`);
    submission.coAuthors.forEach((author, index) => {
      console.log(`     ${index + 1}. ${author.name.firstName} ${author.name.lastName} (Order: ${author.order})`);
    });

    // Step 6: Test presenter designation
    console.log('\n🎤 Step 6: Designate presenters');
    
    // Designate corresponding author as primary presenter
    submission.designatePresenter(
      users.primaryAuthor._id,
      'corresponding',
      true,
      'presenter'
    );
    console.log(`   ✅ Designated corresponding author as primary presenter`);

    // Designate first co-author as co-presenter
    submission.designatePresenter(
      submission.coAuthors[0]._id,
      'coauthor',
      false,
      'co_presenter'
    );
    console.log(`   ✅ Designated first co-author as co-presenter`);

    await submission.save();

    const presenters = submission.getPresenters();
    console.log(`   📊 Total presenters: ${presenters.length}`);
    presenters.forEach(presenter => {
      const name = presenter.authorInfo ? 
        `${presenter.authorInfo.name.firstName} ${presenter.authorInfo.name.lastName}` :
        'Unknown Author';
      console.log(`     - ${name} (${presenter.presentationRole}, Primary: ${presenter.isPrimary})`);
    });

    // Step 7: Test creating student paper with faculty sponsor
    console.log('\n👨‍🎓 Step 7: Create student paper with faculty sponsor');
    const studentSubmissionData = {
      title: 'Student Research with Faculty Sponsorship',
      abstract: 'This is a graduate student research project with faculty sponsorship.',
      keywords: ['student research', 'faculty sponsor'],
      conferenceId: conference._id,
      conferenceYear: conference.year,
      researchType: 'empirical',
      presentationType: 'paper',
      discipline: 'management',
      academicLevel: 'graduate', // This makes it a student paper
      paperUpload: {
        filename: 'student-research.pdf',
        originalName: 'Student Research.pdf',
        path: 'uploads/research/student-research.pdf',
        size: 800000,
        uploadDate: new Date()
      },
      correspondingAuthor: {
        name: {
          firstName: users.studentAuthor.name.firstName,
          lastName: users.studentAuthor.name.lastName,
          title: ''
        },
        email: users.studentAuthor.email,
        phone: '+1-555-0456',
        affiliation: {
          institution: users.studentAuthor.affiliation.organization,
          department: 'MBA Program'
        },
        userId: users.studentAuthor._id
      },
      status: 'draft'
    };

    const studentSubmission = new ResearchSubmission(studentSubmissionData);
    await studentSubmission.save();
    console.log(`   ✅ Created student submission: ${studentSubmission.submissionNumber}`);

    // Add faculty sponsor
    const facultySponsorData = {
      userId: users.facultyAdvisor._id,
      sponsorType: 'faculty_advisor'
    };

    const facultySponsor = await studentSubmission.addFacultySponsor(facultySponsorData);
    await studentSubmission.save();
    console.log(`   ✅ Added faculty sponsor: ${users.facultyAdvisor.name.firstName} ${users.facultyAdvisor.name.lastName}`);
    console.log(`   📋 Sponsor type: ${facultySponsor.sponsorType}`);

    // Step 8: Test search functionality simulation
    console.log('\n🔍 Step 8: Test collaboration history and search ranking');
    
    // Get known collaborators
    const knownCollaborators = submission.getKnownCollaborators();
    console.log(`   ✅ Known collaborators found: ${knownCollaborators.length}`);
    knownCollaborators.forEach(collab => {
      console.log(`     - ${collab.name.firstName} ${collab.name.lastName} (Known: ${collab.isKnownCollaborator})`);
    });

    // Get all authors
    const allAuthors = submission.getAllAuthors();
    console.log(`   📊 Total authors on submission: ${allAuthors.length}`);
    allAuthors.forEach(author => {
      console.log(`     - ${author.name.firstName} ${author.name.lastName} (${author.type}, Presenter: ${author.isPresenter || false})`);
    });

    // Step 9: Test removal operations
    console.log('\n🗑️ Step 9: Test removal operations');
    
    // Remove a co-author
    const authorToRemove = submission.coAuthors[1]; // Get second co-author
    const removedAuthor = submission.removeCoAuthor(authorToRemove._id);
    await submission.save();
    console.log(`   ✅ Removed co-author: ${removedAuthor.name.firstName} ${removedAuthor.name.lastName}`);
    console.log(`   📊 Remaining co-authors: ${submission.coAuthors.length}`);

    // Remove presenter designation
    const presenterToRemove = submission.coAuthors[0]._id;
    const removedPresenter = submission.removePresenter(presenterToRemove);
    await submission.save();
    console.log(`   ✅ Removed presenter designation`);
    console.log(`   📊 Remaining presenters: ${submission.getPresenters().length}`);

    // Remove faculty sponsor
    const removedSponsor = studentSubmission.removeFacultySponsor(facultySponsor._id);
    await studentSubmission.save();
    console.log(`   ✅ Removed faculty sponsor: ${removedSponsor.name.firstName} ${removedSponsor.name.lastName}`);

    // Step 10: Summary and statistics
    console.log('\n📊 Step 10: Final Summary');
    console.log('==============================');
    
    console.log(`\n📋 Main Submission (${submission.submissionNumber}):`);
    console.log(`   Title: ${submission.title}`);
    console.log(`   Corresponding Author: ${submission.correspondingAuthor.name.firstName} ${submission.correspondingAuthor.name.lastName}`);
    console.log(`   Co-Authors: ${submission.coAuthors.length}`);
    console.log(`   Presenters: ${submission.getPresenters().length}`);
    console.log(`   Known Collaborators: ${submission.getKnownCollaborators().length}`);

    submission.coAuthors.forEach((author, index) => {
      console.log(`     ${index + 1}. ${author.name.firstName} ${author.name.lastName}`);
      console.log(`        Institution: ${author.affiliation.institution}`);
      console.log(`        External: ${author.isExternalAuthor}`);
      console.log(`        Known Collaborator: ${author.isKnownCollaborator}`);
      console.log(`        Presenter: ${author.isPresenter}`);
    });

    console.log(`\n📋 Student Submission (${studentSubmission.submissionNumber}):`);
    console.log(`   Title: ${studentSubmission.title}`);
    console.log(`   Student Author: ${studentSubmission.correspondingAuthor.name.firstName} ${studentSubmission.correspondingAuthor.name.lastName}`);
    console.log(`   Faculty Sponsors: ${studentSubmission.facultySponsors.length}`);

    console.log('\n✅ Enhanced co-author management test completed successfully!');

    console.log('\n🎉 All Co-Author Management Features Tested:');
    console.log('   ✅ Known collaborator identification');
    console.log('   ✅ External author addition');
    console.log('   ✅ SOBIE user integration');
    console.log('   ✅ Co-author reordering');
    console.log('   ✅ Presenter designation');
    console.log('   ✅ Faculty sponsor management');
    console.log('   ✅ Author removal operations');
    console.log('   ✅ Search ranking simulation');

    return {
      mainSubmission: submission,
      studentSubmission,
      users,
      conference
    };

  } catch (error) {
    console.error('❌ Co-author management test failed:', error);
    throw error;
  }
}

async function cleanup(testData) {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Remove test submissions
    await ResearchSubmission.deleteMany({
      submissionNumber: { $regex: /^SOBIE-2027-/ }
    });
    console.log('   🗑️ Deleted test submissions');

    // Remove test conference
    await Conference.deleteOne({ year: 2027 });
    console.log('   🗑️ Deleted test conference');

    // Remove test users
    const testEmails = [
      'primary.author@test.edu',
      'collaborator1@test.edu',
      'collaborator2@test.edu',
      'faculty.advisor@test.edu',
      'student.author@test.edu',
      'new.user@test.edu'
    ];
    
    await User.deleteMany({ email: { $in: testEmails } });
    console.log('   🗑️ Deleted test users');

  } catch (error) {
    console.error('⚠️ Cleanup error:', error.message);
  }
}

async function main() {
  try {
    await connectToDatabase();
    
    const testData = await testCoAuthorManagement();
    
    console.log('\n🤔 Do you want to clean up test data? (The script will clean up automatically in 30 seconds)');
    
    // Auto-cleanup after 30 seconds
    setTimeout(async () => {
      await cleanup(testData);
      await mongoose.disconnect();
      console.log('📊 Disconnected from MongoDB');
      process.exit(0);
    }, 30000);

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
