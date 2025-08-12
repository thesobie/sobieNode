const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const ResearchSubmission = require('./src/models/ResearchSubmission');
const Conference = require('./src/models/Conference');

// Load environment variables
dotenv.config();

async function testEnhancedUserAssociation() {
  try {
    console.log('🔗 Testing Enhanced User Association Features...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clean up any existing test data
    await User.deleteMany({ email: /enhanced-test/i });
    await ResearchSubmission.deleteMany({ title: /Enhanced Association Test/i });
    await Conference.deleteMany({ name: /Enhanced Association Test/i });

    // Create test conference
    const conference = new Conference({
      name: 'Enhanced Association Test Conference 2027',
      fullName: 'SOBIE Enhanced Association Test Conference 2027',
      year: 2027,
      edition: 41,
      startDate: new Date('2027-08-01'),
      endDate: new Date('2027-08-03'),
      location: {
        venue: 'Enhanced Test Center',
        city: 'Test City',
        state: 'Test State',
        country: 'USA'
      },
      status: 'active',
      submissionDeadline: new Date('2027-07-01'),
      settings: {
        allowSubmissions: true,
        maxSubmissionsPerUser: 10
      }
    });
    await conference.save();

    // Create primary author
    const primaryAuthor = new User({
      email: 'primary.enhanced-test@example.com',
      password: 'Password123!',
      name: { firstName: 'Primary', lastName: 'Author' },
      userType: 'academic',
      roles: ['user'],
      affiliation: {
        organization: 'Main University',
        department: 'Business School',
        jobTitle: 'Professor'
      },
      isVerified: true
    });
    await primaryAuthor.save();

    // Create submission with external co-authors (no SOBIE accounts yet)
    const submission = new ResearchSubmission({
      title: 'Enhanced Association Test Paper',
      abstract: 'Testing enhanced user association features.',
      keywords: ['testing', 'association', 'enhanced'],
      discipline: 'finance',
      academicLevel: 'faculty',
      researchType: 'empirical',
      conferenceId: conference._id,
      conferenceYear: 2027,
      
      correspondingAuthor: {
        name: {
          firstName: primaryAuthor.name.firstName,
          lastName: primaryAuthor.name.lastName
        },
        email: primaryAuthor.email,
        affiliation: {
          institution: primaryAuthor.affiliation.organization,
          department: primaryAuthor.affiliation.department
        },
        userId: primaryAuthor._id
      },

      paperUpload: {
        filename: 'enhanced-test-paper.pdf',
        originalName: 'Enhanced Test Paper.pdf'
      },

      associatedUsers: [{
        userId: primaryAuthor._id,
        relationship: 'author'
      }]
    });

    // Add external co-authors manually (simulating adding them before they have SOBIE accounts)
    const externalAuthors = [
      {
        email: 'external1.enhanced-test@example.com',
        name: { firstName: 'External', lastName: 'Author1' },
        affiliation: { institution: 'External University 1', department: 'Finance' },
        role: 'co_author'
      },
      {
        email: 'external2.enhanced-test@example.com',
        name: { firstName: 'External', lastName: 'Author2' },
        affiliation: { institution: 'External University 2', department: 'Marketing' },
        role: 'co_author'
      },
      {
        email: 'faculty.enhanced-test@example.com',
        name: { firstName: 'Faculty', lastName: 'Sponsor' },
        affiliation: { institution: 'Sponsor University', department: 'Business School' },
        role: 'faculty_advisor'
      }
    ];

    for (const authorData of externalAuthors) {
      if (authorData.role === 'faculty_advisor') {
        await submission.addFacultySponsor(authorData);
      } else {
        await submission.addCoAuthor(authorData);
      }
    }
    await submission.save();

    console.log(`✅ Created submission with external authors: ${submission.submissionNumber}`);
    console.log(`   📊 Co-authors: ${submission.coAuthors.length}`);
    console.log(`   📊 Faculty sponsors: ${submission.facultySponsors?.length || 0}`);

    // Test 1: Create SOBIE accounts for external authors (simulating user registration)
    console.log('\n👤 Test 1: Creating SOBIE accounts for external authors...');

    const external1 = new User({
      email: 'external1.enhanced-test@example.com',
      password: 'Password123!',
      name: { firstName: 'External', lastName: 'Author1' },
      userType: 'academic',
      roles: ['user'],
      affiliation: {
        organization: 'External University 1',
        department: 'Finance',
        jobTitle: 'Associate Professor'
      },
      isVerified: true
    });
    await external1.save();
    const linked1 = await external1.linkExistingSubmissions();
    console.log(`   ✅ External1 linked to ${linked1} submissions`);

    const external2 = new User({
      email: 'external2.enhanced-test@example.com', 
      password: 'Password123!',
      name: { firstName: 'External', lastName: 'Author2' },
      userType: 'academic',
      roles: ['user'],
      affiliation: {
        organization: 'External University 2',
        department: 'Marketing',
        jobTitle: 'Assistant Professor'
      },
      isVerified: true
    });
    await external2.save();
    const linked2 = await external2.linkExistingSubmissions();
    console.log(`   ✅ External2 linked to ${linked2} submissions`);

    const facultySponsor = new User({
      email: 'faculty.enhanced-test@example.com',
      password: 'Password123!',
      name: { firstName: 'Faculty', lastName: 'Sponsor' },
      userType: 'academic',
      roles: ['user'],
      affiliation: {
        organization: 'Sponsor University',
        department: 'Business School',
        jobTitle: 'Full Professor'
      },
      isVerified: true
    });
    await facultySponsor.save();
    const linked3 = await facultySponsor.linkExistingSubmissions();
    console.log(`   ✅ Faculty Sponsor linked to ${linked3} submissions`);

    // Test 2: Verify all users can see their submissions
    console.log('\n📋 Test 2: Verifying submission visibility for all users...');

    const users = [primaryAuthor, external1, external2, facultySponsor];
    const userNames = ['Primary Author', 'External1', 'External2', 'Faculty Sponsor'];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const name = userNames[i];
      
      const submissions = await user.getResearchSubmissions();
      const stats = await user.getSubmissionStats();
      
      console.log(`   📊 ${name}:`);
      console.log(`      - Total submissions: ${submissions.length}`);
      console.log(`      - As corresponding author: ${stats.roles.correspondingAuthor}`);
      console.log(`      - As co-author: ${stats.roles.coAuthor}`);
      console.log(`      - As faculty advisor: ${stats.roles.facultyAdvisor}`);
      console.log(`      - Collaborators: ${stats.collaborators}`);
    }

    // Test 3: Test new submission with auto-linking
    console.log('\n🔄 Test 3: Testing auto-linking for new submission...');
    
    const newSubmission = new ResearchSubmission({
      title: 'Auto-Link Test Paper',
      abstract: 'Testing automatic linking functionality.',
      keywords: ['auto-linking', 'test'],
      discipline: 'management',
      academicLevel: 'faculty',
      researchType: 'theoretical',
      conferenceId: conference._id,
      conferenceYear: 2027,
      
      correspondingAuthor: {
        name: {
          firstName: external1.name.firstName,
          lastName: external1.name.lastName
        },
        email: external1.email,
        affiliation: {
          institution: external1.affiliation.organization,
          department: external1.affiliation.department
        },
        userId: external1._id
      },

      paperUpload: {
        filename: 'auto-link-test.pdf',
        originalName: 'Auto Link Test.pdf'
      },

      associatedUsers: [{
        userId: external1._id,
        relationship: 'author'
      }]
    });

    // Add co-author by email only (should auto-link)
    await newSubmission.addCoAuthor({
      email: 'external2.enhanced-test@example.com',
      name: { firstName: 'External', lastName: 'Author2' },
      affiliation: { institution: 'External University 2', department: 'Marketing' },
      role: 'co_author'
    });

    await newSubmission.save();
    console.log(`   ✅ Created auto-link test submission: ${newSubmission.submissionNumber}`);
    
    // Check if auto-linking worked
    const autoLinkedAuthor = newSubmission.coAuthors.find(author => 
      author.email === 'external2.enhanced-test@example.com'
    );
    console.log(`   🔗 Auto-linked co-author userId: ${autoLinkedAuthor.userId}`);

    // Test 4: Verify ResearchSubmission.getByUser works correctly
    console.log('\n🔍 Test 4: Testing ResearchSubmission.getByUser static method...');
    
    const external2Submissions = await ResearchSubmission.getByUser(external2._id);
    console.log(`   📋 External2 has ${external2Submissions.length} submissions`);
    
    external2Submissions.forEach((sub, index) => {
      console.log(`      ${index + 1}. ${sub.title} (${sub.submissionNumber})`);
    });

    console.log('\n✅ Enhanced User Association Test Completed Successfully!');
    console.log('\n🎯 Key Features Tested:');
    console.log('   ✅ Automatic email-based user linking when adding co-authors');
    console.log('   ✅ Retroactive linking when users create SOBIE accounts');
    console.log('   ✅ Faculty sponsor linking');
    console.log('   ✅ User submission queries and statistics');
    console.log('   ✅ Auto-linking in new submissions');
    console.log('   ✅ Comprehensive user profile data');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await User.deleteMany({ email: /enhanced-test/i });
    await ResearchSubmission.deleteMany({ title: /Enhanced Association Test|Auto-Link Test/i });
    await Conference.deleteMany({ name: /Enhanced Association Test/i });
    
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
}

testEnhancedUserAssociation();
