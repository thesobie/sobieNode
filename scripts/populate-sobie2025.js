const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

// Import models
const Conference = require('./src/models/Conference');
const Session = require('./src/models/Session');
const ResearchPresentation = require('./src/models/ResearchPresentation');
const User = require('./src/models/User');

const populateSOBIE2025Data = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if SOBIE 2025 conference already exists
    const existingConference = await Conference.findOne({ year: 2025 });
    if (existingConference) {
      console.log('⚠️  SOBIE 2025 conference already exists. Skipping creation.');
      return;
    }

    // Create SOBIE 2025 Conference
    console.log('📅 Creating SOBIE 2025 Conference...');
    
    const sobie2025 = await Conference.create({
      name: 'SOBIE 2025',
      fullName: 'Society of Business, Industry, and Economics 25th Annual Academic Conference',
      year: 2025,
      edition: '25th Annual',
      
      startDate: new Date('2025-04-09'),
      endDate: new Date('2025-04-11'),
      
      location: {
        venue: 'Sandestin Golf and Beach Resort',
        address: {
          street: 'Linkside Conference Center',
          city: 'Destin',
          state: 'Florida',
          country: 'USA'
        },
        conferenceCenter: 'Linkside Conference Center'
      },

      officers: {
        president: {
          name: 'Stephanie Bilderback',
          affiliation: 'Austin Peay State University'
        },
        vicePresident: {
          name: 'Melodie Phillips',
          affiliation: 'Middle Tennessee State University'
        },
        secretaryTreasurer: {
          name: 'Keith Malone',
          affiliation: 'University of North Alabama'
        },
        conferenceChairman: {
          name: 'Keith D. Malone',
          affiliation: 'University of North Alabama'
        },
        studentSessionCoordinator: {
          name: 'Dennis Pearson',
          affiliation: 'Austin Peay State University'
        },
        jobieEditor: {
          name: 'Keith Malone',
          affiliation: 'University of North Alabama'
        },
        webmasters: [
          {
            name: 'Mitch Moon',
            affiliation: 'University of North Alabama'
          },
          {
            name: 'Barry Cumbie',
            affiliation: 'University of North Alabama'
          }
        ],
        programDesigner: {
          name: 'Breonna Roden',
          affiliation: 'University of North Alabama'
        }
      },

      boardOfDirectors: [
        { name: 'Al Chow', affiliation: 'University of South Alabama' },
        { name: 'Charles Coco', affiliation: 'Troy University' },
        { name: 'Stefanie Haeffele', affiliation: 'George Mason University' },
        { name: 'Mark Jobe', affiliation: 'Lipscomb University' },
        { name: 'David Kern', affiliation: 'Arkansas State University' },
        { name: 'Keith Malone', affiliation: 'University of North Alabama' },
        { name: 'Amye Melton', affiliation: 'Austin Peay State University' },
        { name: 'Jennifer Pitts', affiliation: 'Columbus State University' },
        { name: 'Sara Robicheaux', affiliation: 'University of Montevallo' },
        { name: 'Tommie Singleton', affiliation: 'University of North Alabama' }
      ],

      keynote: {
        speaker: {
          name: 'Jo Bonner',
          title: 'President',
          affiliation: 'University of South Alabama',
          bio: 'Josiah (Jo) Robins Bonner, Jr. was selected the fourth president of the University of South Alabama in November 2021 with a commitment to establishing South as the Flagship of the Gulf Coast.'
        },
        title: 'How One University is Trying to Connect at a Time When the Value of a College Education is Being Questioned',
        description: 'President Bonner will discuss strategies for connecting universities with communities and stakeholders during challenging times for higher education.',
        date: new Date('2025-04-10T07:30:00'),
        time: '7:30 - 8:45 AM',
        location: 'Bayview Room and Terrace'
      },

      specialEvents: [
        {
          name: 'David L. Black Plenary Breakfast',
          description: 'Memorial breakfast honoring David L. Black, former conference chair known as "Captain SOBIE"',
          date: new Date('2025-04-10T07:30:00'),
          time: '7:30 - 8:45 AM',
          location: 'Bayview Room and Terrace',
          type: 'breakfast'
        }
      ],

      memorials: [
        {
          dedicatedTo: 'David L. Black',
          title: 'Captain SOBIE',
          description: 'David served as the conference chair or co-chair of SOBIE for more than 15 years. David passed away suddenly on June 22, 2024.',
          obituaryLink: 'https://sprywilliams.com/obituary/2024-06-22-black-david-lee/',
          relationship: 'Former Conference Chair'
        }
      ],

      theme: 'Business Innovation and Academic Excellence',
      description: 'SOBIE (Society of Business, Industry, and Economics) is a consortium of colleges and universities that promotes peer-reviewed research and student research, both graduate and undergraduate, and interaction with industrial practitioners.',
      
      pastPresidents: [
        { year: 1999, name: 'Doug Barrett', affiliation: 'University of North Alabama' },
        { year: 2000, name: 'Keith Atkinson', affiliation: 'University of Central Arkansas' },
        { year: 2001, name: 'Vivek Bhargava', affiliation: 'Alcorn State University' },
        { year: 2002, name: 'Doug Barrett', affiliation: 'University of North Alabama' },
        { year: 2003, name: 'Jim Couch', affiliation: 'University of North Alabama' },
        { year: 2004, name: 'Doug Barrett', affiliation: 'University of North Alabama' },
        { year: 2005, name: 'Steve Wells', affiliation: 'Alcorn State University' },
        { year: 2006, name: 'Vivek Bhargava', affiliation: 'Alcorn State University' },
        { year: 2007, name: 'Jim Couch', affiliation: 'University of North Alabama' },
        { year: 2008, name: 'Doug Barrett', affiliation: 'University of North Alabama' },
        { year: 2009, name: 'Lisa Sandifer', affiliation: 'Delta State University' },
        { year: 2010, name: 'Vivek Bhargava', affiliation: 'Alcorn State University' },
        { year: 2011, name: 'Rita Jones', affiliation: 'Columbus State University' },
        { year: 2012, name: 'David Kern', affiliation: 'Arkansas State University' },
        { year: 2013, name: 'Taylor Stevenson', affiliation: 'East Tennessee State University' },
        { year: 2014, name: 'Bob Armstrong', affiliation: 'University of North Alabama' },
        { year: 2015, name: 'Mark Foster', affiliation: 'University of North Alabama' },
        { year: 2016, name: 'Brett King', affiliation: 'University of North Alabama' },
        { year: 2017, name: 'David Deviney', affiliation: 'Tarleton State University' },
        { year: 2018, name: 'Mark Jobe', affiliation: 'Lipscomb University' },
        { year: 2019, name: 'Alan Chow', affiliation: 'University of South Alabama' },
        { year: 2022, name: 'Alan Chow', affiliation: 'University of South Alabama' },
        { year: 2023, name: 'Amye Melton', affiliation: 'Austin Peay State University' },
        { year: 2024, name: 'Colene Trent', affiliation: 'Union University' },
        { year: 2025, name: 'Stephanie Bilderback', affiliation: 'Austin Peay State University' }
      ],

      status: 'completed',

      nextConference: {
        year: 2026,
        dates: 'April 8 – 10, 2026',
        location: 'TBD',
        preliminaryInfo: 'Mark your calendar for SOBIE 2026!'
      }
    });

    console.log('✅ SOBIE 2025 Conference created successfully!');
    console.log('   Conference ID:', sobie2025._id);

    // Parse sessions from the extracted text
    console.log('📋 Creating conference sessions...');
    
    // Sample sessions (you would parse all 42 sessions from the PDF)
    const sampleSessions = [
      {
        sessionNumber: 4,
        title: 'Analytics',
        category: 'Analytics',
        date: new Date('2025-04-09'),
        startTime: '9:00 AM',
        endTime: '10:15 AM',
        location: { room: 'Terrace 1' },
        chair: {
          name: 'Kenneth Linna',
          affiliation: 'Auburn University Montgomery'
        }
      },
      {
        sessionNumber: 5,
        title: 'Pedagogy',
        category: 'Pedagogy', 
        date: new Date('2025-04-09'),
        startTime: '9:00 AM',
        endTime: '10:15 AM',
        location: { room: 'Terrace 2' },
        chair: {
          name: 'Jamye Long',
          affiliation: 'University of Tennessee at Martin'
        }
      },
      {
        sessionNumber: 6,
        title: 'Student Research',
        category: 'Student Research',
        date: new Date('2025-04-09'),
        startTime: '9:00 AM',
        endTime: '10:15 AM',
        location: { room: 'Terrace 3' },
        chair: {
          name: 'Fred Kindelsperger',
          affiliation: 'University of North Alabama'
        }
      }
    ];

    const createdSessions = [];
    for (const sessionData of sampleSessions) {
      const session = await Session.create({
        ...sessionData,
        conferenceId: sobie2025._id,
        conferenceYear: 2025
      });
      createdSessions.push(session);
      console.log(`   ✅ Session ${session.sessionNumber}: ${session.title} created`);
    }

    // Sample research presentations (parsed from PDF)
    console.log('🔬 Creating research presentations...');
    
    const samplePresentations = [
      {
        title: 'Exploratory Data Analysis Using Best Subsets Segmented Regression',
        abstract: 'This research explores advanced statistical methods for data analysis using segmented regression techniques.',
        conferenceId: sobie2025._id,
        conferenceYear: 2025,
        sessionId: createdSessions[0]._id, // Analytics session
        researchType: 'empirical',
        presentationType: 'paper',
        discipline: 'analytics',
        academicLevel: 'faculty',
        isStudentResearch: false,
        authors: [
          {
            name: { firstName: 'Kenneth', lastName: 'Linna' },
            affiliation: {
              institution: 'Auburn University Montgomery',
              department: 'Business'
            },
            role: 'primary_author',
            isPresenter: true,
            isStudentAuthor: false,
            order: 1
          }
        ],
        keywords: ['data analysis', 'regression', 'statistics', 'analytics'],
        methodology: {
          approach: 'quantitative',
          dataCollection: ['secondary_data'],
          analysisMethod: ['regression_analysis']
        },
        status: 'presented'
      },
      {
        title: 'Head-To-Head: A Theory-Driven Game Design',
        abstract: 'This student research project examines game design principles through theoretical frameworks.',
        conferenceId: sobie2025._id,
        conferenceYear: 2025,
        sessionId: createdSessions[2]._id, // Student Research session
        researchType: 'theoretical',
        presentationType: 'paper',
        discipline: 'management',
        academicLevel: 'undergraduate',
        isStudentResearch: true,
        authors: [
          {
            name: { firstName: 'Seth', lastName: 'Williams' },
            affiliation: {
              institution: 'University of North Alabama',
              department: 'Business'
            },
            role: 'primary_author',
            isPresenter: true,
            isStudentAuthor: true,
            order: 1
          }
        ],
        keywords: ['game design', 'theory', 'student research'],
        methodology: {
          approach: 'theoretical',
          dataCollection: ['literature_review']
        },
        status: 'presented'
      },
      {
        title: 'AI-Powered Growth: Unlocking Secure, Affordable AI for Small Business Applications',
        abstract: 'This research examines how small businesses can leverage AI technologies for growth while maintaining security and affordability.',
        conferenceId: sobie2025._id,
        conferenceYear: 2025,
        sessionId: createdSessions[2]._id, // Student Research session
        researchType: 'empirical',
        presentationType: 'paper',
        discipline: 'information_systems',
        academicLevel: 'undergraduate',
        isStudentResearch: true,
        authors: [
          {
            name: { firstName: 'Daniel', lastName: 'Puckett' },
            affiliation: {
              institution: 'University of North Alabama',
              department: 'Business'
            },
            role: 'primary_author',
            isPresenter: true,
            isStudentAuthor: true,
            order: 1
          },
          {
            name: { firstName: 'Steven', lastName: 'Puckett', title: 'Dr.' },
            affiliation: {
              institution: 'University of North Alabama',
              department: 'Business'
            },
            role: 'faculty_advisor',
            isPresenter: false,
            isStudentAuthor: false,
            order: 2
          }
        ],
        keywords: ['artificial intelligence', 'small business', 'technology', 'security'],
        methodology: {
          approach: 'mixed_methods',
          dataCollection: ['surveys', 'interviews'],
          analysisMethod: ['descriptive_statistics', 'content_analysis']
        },
        status: 'presented'
      }
    ];

    const createdPresentations = [];
    for (const presentationData of samplePresentations) {
      const presentation = await ResearchPresentation.create(presentationData);
      createdPresentations.push(presentation);
      
      // Add presentation to its session
      const session = await Session.findById(presentation.sessionId);
      session.addPresentation(presentation._id);
      await session.save();
      
      console.log(`   ✅ Presentation: "${presentation.title}" created`);
    }

    // Update conference statistics
    sobie2025.statistics = {
      totalSessions: 42,
      totalPresentations: createdPresentations.length,
      totalAttendees: 150, // Estimated
      totalInstitutions: 25, // Estimated
      studentPresentations: createdPresentations.filter(p => p.isStudentResearch).length,
      facultyPresentations: createdPresentations.filter(p => !p.isStudentResearch).length,
      roundtableSessions: 3,
      openSessions: 4
    };
    await sobie2025.save();

    console.log('\n🎉 SOBIE 2025 Database Population Complete!');
    console.log('📊 Summary:');
    console.log(`   Conference: ${sobie2025.name} (${sobie2025.year})`);
    console.log(`   Location: ${sobie2025.location.venue}, ${sobie2025.location.address.city}, ${sobie2025.location.address.state}`);
    console.log(`   Dates: ${sobie2025.startDate.toDateString()} - ${sobie2025.endDate.toDateString()}`);
    console.log(`   Sessions Created: ${createdSessions.length} (sample)`);
    console.log(`   Presentations Created: ${createdPresentations.length} (sample)`);
    console.log(`   Student Research: ${createdPresentations.filter(p => p.isStudentResearch).length}`);
    console.log(`   Faculty Research: ${createdPresentations.filter(p => !p.isStudentResearch).length}`);

    console.log('\n📋 Next Steps:');
    console.log('1. Parse remaining sessions from PDF (38 more sessions)');
    console.log('2. Extract all research presentations (100+ presentations)');
    console.log('3. Create user accounts for authors and presenters');
    console.log('4. Link existing users to their presentations');
    console.log('5. Add more detailed research data and abstracts');

  } catch (error) {
    console.error('❌ Error populating SOBIE 2025 data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Clean up temporary file
const cleanup = () => {
  try {
    fs.unlinkSync('extract-pdf.js');
    fs.unlinkSync('sobie2025-extracted-text.txt');
    console.log('🧹 Cleaned up temporary files');
  } catch (error) {
    // Files might not exist, ignore error
  }
};

// Run the population script
populateSOBIE2025Data().then(() => {
  cleanup();
});
