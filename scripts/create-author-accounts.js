const mongoose = require('mongoose');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

// Import models
const User = require('./src/models/User');
const Conference = require('./src/models/Conference');
const ResearchPresentation = require('./src/models/ResearchPresentation');

const createAuthorAccounts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get SOBIE 2025 conference
    const conference = await Conference.findOne({ year: 2025 });
    if (!conference) {
      console.error('❌ SOBIE 2025 conference not found.');
      process.exit(1);
    }

    // Parse author information from the full text
    console.log('👥 Extracting author information from SOBIE 2025...');
    
    const authorData = extractAuthorData();
    console.log(`✅ Found ${authorData.length} unique authors`);

    // Create user accounts for authors
    let createdUsers = 0;
    let existingUsers = 0;
    let updatedUsers = 0;

    for (const authorInfo of authorData) {
      try {
        // Generate email based on name and institution
        const email = generateEmail(authorInfo.name, authorInfo.affiliation);
        
        // Check if user already exists
        let user = await User.findOne({ 
          $or: [
            { email: email },
            { 
              'name.firstName': authorInfo.name.firstName,
              'name.lastName': authorInfo.name.lastName,
              'affiliation.organization': authorInfo.affiliation.institution
            }
          ]
        });

        if (user) {
          console.log(`   ⚠️  User exists: ${user.name.firstName} ${user.name.lastName} (${user.email})`);
          existingUsers++;
          
          // Update affiliation if needed
          if (!user.affiliation || user.affiliation.organization !== authorInfo.affiliation.institution) {
            user.affiliation.organization = authorInfo.affiliation.institution;
            user.affiliation.department = authorInfo.affiliation.department;
            user.affiliation.jobTitle = authorInfo.affiliation.position;
            await user.save();
            updatedUsers++;
            console.log(`       ✅ Updated affiliation`);
          }
        } else {
          // Create new user
          user = await User.create({
            name: {
              firstName: authorInfo.name.firstName,
              lastName: authorInfo.name.lastName,
              prefix: authorInfo.name.title || ''
            },
            email: email,
            affiliation: {
              organization: authorInfo.affiliation.institution,
              department: authorInfo.affiliation.department,
              jobTitle: authorInfo.affiliation.position
            },
            userType: authorInfo.academicLevel === 'faculty' ? 'academic' : 
                     (authorInfo.academicLevel === 'undergraduate' || authorInfo.academicLevel === 'graduate') ? 'student' : 'other',
            studentLevel: (authorInfo.academicLevel === 'undergraduate' || authorInfo.academicLevel === 'graduate') ? 
                         authorInfo.academicLevel : undefined,
            roles: ['user'], // Start with basic user role
            isEmailVerified: false, // Will need manual verification
            isActive: true,
            password: 'TempPass123!', // Temporary password meeting requirements
            profileCompleted: false,
            // Add research interests as bio
            bio: authorInfo.researchInterests ? 
                 `Research interests: ${authorInfo.researchInterests.join(', ')}` : '',
            // Add SOBIE-specific fields if needed
            consentGiven: true,
            privacySettingsConfigured: true
          });

          console.log(`   ✅ Created user: ${user.name.firstName} ${user.name.lastName} (${user.email})`);
          createdUsers++;
        }

        // Link user to their presentations
        await linkUserToPresentations(user, authorInfo, conference);

      } catch (error) {
        console.error(`   ❌ Error creating user for ${authorInfo.name.firstName} ${authorInfo.name.lastName}:`, error.message);
      }
    }

    console.log('\n🎉 Author Account Creation Complete!');
    console.log('📊 Summary:');
    console.log(`   New Users Created: ${createdUsers}`);
    console.log(`   Existing Users Found: ${existingUsers}`);
    console.log(`   Users Updated: ${updatedUsers}`);
    console.log(`   Total Authors Processed: ${authorData.length}`);

    // Generate summary report
    await generateAuthorReport(conference);

  } catch (error) {
    console.error('❌ Error creating author accounts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Function to extract author data from various sources
function extractAuthorData() {
  const authors = [];
  
  // Sample author data based on SOBIE 2025 program
  // In a real implementation, this would parse the full PDF text
  const authorList = [
    {
      name: { firstName: 'Kenneth', lastName: 'Linna' },
      affiliation: {
        institution: 'Auburn University Montgomery',
        department: 'School of Business',
        position: 'Professor'
      },
      roles: ['user'], // Will be updated based on participation
      academicLevel: 'faculty',
      researchInterests: ['data analytics', 'regression analysis', 'statistics'],
      presentations: ['Exploratory Data Analysis Using Best Subsets Segmented Regression']
    },
    {
      name: { firstName: 'Collin', lastName: 'Philipps' },
      affiliation: {
        institution: 'University of North Alabama',
        department: 'College of Business',
        position: 'Assistant Professor'
      },
      roles: ['user'],
      academicLevel: 'faculty',
      researchInterests: ['statistics', 'expectiles', 'quantitative methods'],
      presentations: ['Interpreting Expectiles']
    },
    {
      name: { firstName: 'Angela', lastName: 'Walters' },
      affiliation: {
        institution: 'Fort Hays State University',
        department: 'Business School',
        position: 'Associate Professor'
      },
      roles: ['user'],
      academicLevel: 'faculty',
      researchInterests: ['spatial computing', 'travel behavior', 'technology adoption'],
      presentations: ['The Influence of Spatial Computing on Travel Intentions']
    },
    {
      name: { firstName: 'Jamye', lastName: 'Long' },
      affiliation: {
        institution: 'University of Tennessee at Martin',
        department: 'College of Business and Global Affairs',
        position: 'Professor'
      },
      roles: ['user'],
      academicLevel: 'faculty',
      researchInterests: ['pedagogy', 'student engagement', 'business education'],
      presentations: ['Enhancing Student Engagement through Interactive Learning']
    },
    {
      name: { firstName: 'Fred', lastName: 'Kindelsperger' },
      affiliation: {
        institution: 'University of North Alabama',
        department: 'College of Business',
        position: 'Professor'
      },
      roles: ['user'],
      academicLevel: 'faculty',
      researchInterests: ['student research', 'mentorship', 'business education'],
      presentations: []
    },
    {
      name: { firstName: 'Seth', lastName: 'Williams' },
      affiliation: {
        institution: 'University of North Alabama',
        department: 'College of Business',
        position: 'Student'
      },
      roles: ['user'],
      academicLevel: 'undergraduate',
      researchInterests: ['game design', 'theory', 'business strategy'],
      presentations: ['Head-To-Head: A Theory-Driven Game Design']
    },
    {
      name: { firstName: 'Daniel', lastName: 'Puckett' },
      affiliation: {
        institution: 'University of North Alabama',
        department: 'College of Business',
        position: 'Student'
      },
      roles: ['user'],
      academicLevel: 'undergraduate',
      researchInterests: ['artificial intelligence', 'small business', 'technology'],
      presentations: ['AI-Powered Growth: Unlocking Secure, Affordable AI for Small Business Applications']
    },
    {
      name: { firstName: 'Steven', lastName: 'Puckett', title: 'Dr.' },
      affiliation: {
        institution: 'University of North Alabama',
        department: 'College of Business',
        position: 'Professor'
      },
      roles: ['user'],
      academicLevel: 'faculty',
      researchInterests: ['artificial intelligence', 'business technology', 'student mentorship'],
      presentations: []
    }

    // Add more authors from the complete program...
    // This would include all 100+ authors from the SOBIE 2025 conference
  ];

  return authorList;
}

// Function to generate email based on name and institution
function generateEmail(name, affiliation) {
  const firstName = name.firstName.toLowerCase();
  const lastName = name.lastName.toLowerCase();
  
  // Create institution domain mapping
  const institutionDomains = {
    'Auburn University Montgomery': 'aum.edu',
    'University of North Alabama': 'una.edu',
    'Fort Hays State University': 'fhsu.edu',
    'University of Tennessee at Martin': 'utm.edu',
    'Austin Peay State University': 'apsu.edu',
    'Middle Tennessee State University': 'mtsu.edu',
    'University of South Alabama': 'southalabama.edu'
  };

  const domain = institutionDomains[affiliation.institution] || 'email.com';
  return `${firstName}.${lastName}@${domain}`;
}

// Function to link users to their presentations
async function linkUserToPresentations(user, authorInfo, conference) {
  try {
    // Find presentations by this author
    const presentations = await ResearchPresentation.find({
      conferenceId: conference._id,
      'authors.name.firstName': authorInfo.name.firstName,
      'authors.name.lastName': authorInfo.name.lastName
    });

    // Update each presentation to include the user ID
    for (const presentation of presentations) {
      presentation.authors = presentation.authors.map(author => {
        if (author.name.firstName === user.name.firstName && 
            author.name.lastName === user.name.lastName) {
          author.userId = user._id;
        }
        return author;
      });
      
      await presentation.save();
    }

    console.log(`       🔗 Linked to ${presentations.length} presentations`);
  } catch (error) {
    console.error(`       ❌ Error linking presentations:`, error.message);
  }
}

// Function to generate author report
async function generateAuthorReport(conference) {
  try {
    console.log('\n📊 Generating Author Report...');
    
    const totalUsers = await User.countDocuments({});
    const presenters = await User.countDocuments({ roles: 'presenter' });
    const faculty = await User.countDocuments({ userType: 'academic' });
    const students = await User.countDocuments({ 
      userType: 'student'
    });
    
    // Get institution breakdown
    const institutionStats = await User.aggregate([
      {
        $group: {
          _id: '$affiliation.organization',
          count: { $sum: 1 },
          faculty: {
            $sum: {
              $cond: [{ $eq: ['$userType', 'academic'] }, 1, 0]
            }
          },
          students: {
            $sum: {
              $cond: [{ $eq: ['$userType', 'student'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const report = {
      conference: conference.name,
      generated: new Date(),
      summary: {
        totalUsers,
        presenters,
        faculty,
        students,
        institutions: institutionStats.length
      },
      institutionBreakdown: institutionStats,
      topInstitutions: institutionStats.slice(0, 10)
    };

    // Save report
    fs.writeFileSync('author-report.json', JSON.stringify(report, null, 2));
    console.log('💾 Author report saved to author-report.json');

    console.log('\n📈 Author Statistics:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Presenters: ${presenters}`);
    console.log(`   Faculty: ${faculty}`);
    console.log(`   Students: ${students}`);
    console.log(`   Institutions: ${institutionStats.length}`);

    console.log('\n🏛️  Top Institutions:');
    institutionStats.slice(0, 5).forEach(inst => {
      console.log(`   ${inst._id}: ${inst.count} (${inst.faculty} faculty, ${inst.students} students)`);
    });

  } catch (error) {
    console.error('❌ Error generating author report:', error);
  }
}

// Run the author account creation
createAuthorAccounts();
