const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');

// Import models
const Conference = require('./src/models/Conference');
const User = require('./src/models/User');
const ConferenceRegistration = require('./src/models/ConferenceRegistration');
const ResearchSubmission = require('./src/models/ResearchSubmission');
const Session = require('./src/models/Session');
const SOBIEProgramParser = require('./src/services/programParserService');

// Import configuration
require('dotenv').config();

/**
 * SOBIE 2023 Database Population Script
 * Extracts data from SOBIE 2023 program PDF and populates the database
 */

class SOBIE2023Migrator {
  constructor() {
    this.pdfPath = '/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents/2023/program/sobie-2023-program.pdf';
    this.extractedData = null;
    this.conference = null;
    this.users = [];
    this.registrations = [];
    this.sessions = [];
    this.researchSubmissions = [];
    this.stats = {
      usersCreated: 0,
      usersUpdated: 0,
      registrationsCreated: 0,
      sessionsCreated: 0,
      researchCreated: 0,
      errors: []
    };
  }

  /**
   * Main migration process
   */
  async migrate() {
    try {
      console.log('🚀 Starting SOBIE 2023 Database Migration');
      console.log('======================================\n');

      // Connect to MongoDB
      await this.connectDatabase();

      // Extract data from PDF
      await this.extractDataFromPDF();

      // Create conference record
      await this.createConference();

      // Create user profiles
      await this.createUsers();

      // Create conference registrations
      await this.createRegistrations();

      // Create sessions
      await this.createSessions();

      // Create research submissions
      await this.createResearchSubmissions();

      // Generate migration report
      await this.generateReport();

      console.log('\n✅ Migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await mongoose.disconnect();
    }
  }

  /**
   * Connect to MongoDB database
   */
  async connectDatabase() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sobienode';
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  /**
   * Extract data from SOBIE 2023 PDF
   */
  async extractDataFromPDF() {
    try {
      console.log('📄 Extracting data from SOBIE 2023 PDF...');
      
      const parser = new SOBIEProgramParser();
      this.extractedData = await parser.parseProgramPDF(this.pdfPath);
      
      console.log(`✅ Data extracted successfully:`);
      console.log(`   - Conference: ${this.extractedData.conference.title}`);
      console.log(`   - Attendees: ${this.extractedData.attendees.length}`);
      console.log(`   - Presentations: ${this.extractedData.presentations.length}`);
      console.log(`   - Sessions: ${this.extractedData.sessions.length}`);
      console.log(`   - Schedule items: ${this.extractedData.schedule.length}\n`);
      
    } catch (error) {
      console.error('❌ PDF extraction failed:', error);
      throw error;
    }
  }

  /**
   * Create or update conference record
   */
  async createConference() {
    try {
      console.log('🏛️ Creating conference record...');
      
      const conferenceData = this.extractedData.conference;
      
      // Check if conference already exists
      let existingConference = await Conference.findOne({ year: conferenceData.year });
      
      if (existingConference) {
        console.log(`   - Conference ${conferenceData.year} already exists, updating...`);
        
        // Update existing conference
        existingConference.title = conferenceData.title || existingConference.title;
        existingConference.name = conferenceData.name || existingConference.name;
        existingConference.location = {
          ...existingConference.location,
          venue: conferenceData.venue || existingConference.location?.venue,
          city: conferenceData.city || existingConference.location?.city,
          state: conferenceData.state || existingConference.location?.state,
          country: conferenceData.country || existingConference.location?.country
        };
        existingConference.extractedFrom = 'sobie2023program';
        
        this.conference = await existingConference.save();
        
      } else {
        // Create new conference
        this.conference = new Conference({
          title: conferenceData.title || `SOBIE ${conferenceData.year}`,
          year: conferenceData.year,
          name: conferenceData.name || `SOBIE ${conferenceData.year}`,
          description: 'Society of Business, Industry, and Economics Annual Conference',
          startDate: new Date(`${conferenceData.year}-04-12`), // April 12-14, 2023
          endDate: new Date(`${conferenceData.year}-04-14`),
          location: {
            venue: conferenceData.venue || 'Sandestin Golf and Beach Resort',
            city: conferenceData.city || 'Miramar Beach',
            state: conferenceData.state || 'Florida',
            country: conferenceData.country || 'USA',
            address: 'Sandestin Golf and Beach Resort, Miramar Beach, FL'
          },
          status: 'completed',
          extractedFrom: 'sobie2023program'
        });
        
        await this.conference.save();
        console.log(`   - Conference created: ${this.conference.title} (${this.conference.year})`);
      }
      
    } catch (error) {
      console.error('❌ Conference creation failed:', error);
      this.stats.errors.push(`Conference creation: ${error.message}`);
    }
  }

  /**
   * Create user profiles from extracted attendee data
   */
  async createUsers() {
    try {
      console.log('👥 Creating user profiles...');
      
      for (const attendeeData of this.extractedData.attendees) {
        try {
          // Generate email if not provided
          const firstName = attendeeData.name.first.toLowerCase();
          const lastName = attendeeData.name.last.toLowerCase();
          const generatedEmail = `${firstName}.${lastName}@extracted.sobie.org`;
          
          // Check if user already exists
          const existingUser = await User.findOne({
            $or: [
              { 
                'name.first': { $regex: new RegExp(`^${attendeeData.name.first}$`, 'i') },
                'name.last': { $regex: new RegExp(`^${attendeeData.name.last}$`, 'i') }
              },
              { email: generatedEmail }
            ]
          });

          if (existingUser) {
            // Update existing user with additional information
            if (attendeeData.affiliation && !existingUser.profile?.affiliation) {
              existingUser.profile = existingUser.profile || {};
              existingUser.profile.affiliation = attendeeData.affiliation;
              existingUser.profile.extractedFrom = 'sobie2023program';
              await existingUser.save();
              this.stats.usersUpdated++;
            }
            this.users.push(existingUser);
          } else {
            // Create new user
            const newUser = new User({
              name: {
                first: attendeeData.name.first,
                last: attendeeData.name.last
              },
              email: generatedEmail,
              password: 'TempPassword123!', // Temporary password
              profile: {
                affiliation: attendeeData.affiliation || '',
                bio: `SOBIE 2023 attendee from ${attendeeData.affiliation || 'Unknown Institution'}`,
                extractedFrom: 'sobie2023program',
                isExtractedData: true
              },
              role: 'user',
              isEmailVerified: false,
              isActive: true
            });

            await newUser.save();
            this.users.push(newUser);
            this.stats.usersCreated++;
          }
          
        } catch (userError) {
          console.warn(`   - Warning: Could not create user ${attendeeData.fullName}: ${userError.message}`);
          this.stats.errors.push(`User creation (${attendeeData.fullName}): ${userError.message}`);
        }
      }
      
      console.log(`   - Users created: ${this.stats.usersCreated}`);
      console.log(`   - Users updated: ${this.stats.usersUpdated}`);
      
    } catch (error) {
      console.error('❌ User creation failed:', error);
      this.stats.errors.push(`User creation: ${error.message}`);
    }
  }

  /**
   * Create conference registrations
   */
  async createRegistrations() {
    try {
      console.log('📝 Creating conference registrations...');
      
      for (const user of this.users) {
        try {
          // Check if registration already exists
          const existingRegistration = await ConferenceRegistration.findOne({
            userId: user._id,
            conferenceId: this.conference._id
          });

          if (!existingRegistration) {
            const registration = new ConferenceRegistration({
              userId: user._id,
              conferenceId: this.conference._id,
              status: 'confirmed',
              registrationInfo: {
                personalInfo: {
                  fullName: `${user.name.first} ${user.name.last}`,
                  email: user.email,
                  affiliation: user.profile?.affiliation || ''
                },
                preferences: {
                  dietaryRestrictions: [],
                  accessibilityNeeds: ''
                }
              },
              extractedFrom: 'sobie2023program',
              confirmation: {
                confirmed: true,
                confirmedAt: new Date(`${this.conference.year}-01-01`)
              },
              registeredAt: new Date(`${this.conference.year}-01-01`)
            });

            await registration.save();
            this.registrations.push(registration);
            this.stats.registrationsCreated++;
          }
          
        } catch (regError) {
          console.warn(`   - Warning: Could not create registration for ${user.name.first} ${user.name.last}: ${regError.message}`);
          this.stats.errors.push(`Registration (${user.name.first} ${user.name.last}): ${regError.message}`);
        }
      }
      
      console.log(`   - Registrations created: ${this.stats.registrationsCreated}`);
      
    } catch (error) {
      console.error('❌ Registration creation failed:', error);
      this.stats.errors.push(`Registration creation: ${error.message}`);
    }
  }

  /**
   * Create session records
   */
  async createSessions() {
    try {
      console.log('🎯 Creating session records...');
      
      let sessionNumber = 1;
      
      for (const sessionData of this.extractedData.sessions) {
        try {
          // Find session chair user if available
          let chairUser = null;
          if (sessionData.chair) {
            chairUser = this.users.find(user => 
              user.name.first.toLowerCase().includes(sessionData.chair.toLowerCase()) ||
              user.name.last.toLowerCase().includes(sessionData.chair.toLowerCase())
            );
          }

          const session = new Session({
            sessionNumber: sessionNumber++,
            title: sessionData.name || `Session ${sessionNumber}`,
            category: this.mapSessionCategory(sessionData.type || sessionData.name),
            track: this.mapSessionTrack(sessionData.type || sessionData.name),
            conferenceId: this.conference._id,
            conferenceYear: this.conference.year,
            date: new Date(`${this.conference.year}-04-12`), // Default to first day
            startTime: '9:00 AM', // Default time
            endTime: '10:15 AM',
            location: {
              room: sessionData.location || 'TBD',
              venue: 'Sandestin Golf and Beach Resort'
            },
            chair: chairUser ? {
              name: `${chairUser.name.first} ${chairUser.name.last}`,
              affiliation: chairUser.profile?.affiliation,
              email: chairUser.email,
              userId: chairUser._id
            } : (sessionData.chair ? {
              name: sessionData.chair,
              affiliation: '',
              email: ''
            } : undefined),
            sessionType: 'presentation',
            status: 'completed',
            description: sessionData.description || '',
            extractedFrom: 'sobie2023program'
          });

          await session.save();
          this.sessions.push(session);
          this.stats.sessionsCreated++;
          
        } catch (sessionError) {
          console.warn(`   - Warning: Could not create session ${sessionData.name}: ${sessionError.message}`);
          this.stats.errors.push(`Session (${sessionData.name}): ${sessionError.message}`);
        }
      }
      
      console.log(`   - Sessions created: ${this.stats.sessionsCreated}`);
      
    } catch (error) {
      console.error('❌ Session creation failed:', error);
      this.stats.errors.push(`Session creation: ${error.message}`);
    }
  }

  /**
   * Create research submissions from presentations
   */
  async createResearchSubmissions() {
    try {
      console.log('📊 Creating research submissions...');
      
      for (const presentationData of this.extractedData.presentations) {
        try {
          if (presentationData.title && presentationData.title.length > 10) {
            // Try to find the presenter user
            let presenterUser = null;
            if (presentationData.presenter) {
              presenterUser = this.users.find(user => 
                user.name.first.toLowerCase().includes(presentationData.presenter.toLowerCase()) ||
                user.name.last.toLowerCase().includes(presentationData.presenter.toLowerCase())
              );
            }

            const researchSubmission = new ResearchSubmission({
              title: presentationData.title.substring(0, 200),
              abstract: presentationData.abstract || 'Abstract not available from extracted data.',
              keywords: presentationData.keywords || [],
              submittedBy: presenterUser?._id,
              authors: presenterUser ? [{
                userId: presenterUser._id,
                name: `${presenterUser.name.first} ${presenterUser.name.last}`,
                affiliation: presenterUser.profile?.affiliation || '',
                isPrimary: true
              }] : [],
              conference: {
                year: this.conference.year,
                conferenceId: this.conference._id
              },
              submissionType: this.mapPresentationType(presentationData.type),
              status: 'accepted',
              extractedFrom: 'sobie2023program',
              submittedAt: new Date(`${this.conference.year}-01-01`),
              acceptedAt: new Date(`${this.conference.year}-03-01`)
            });

            await researchSubmission.save();
            this.researchSubmissions.push(researchSubmission);
            this.stats.researchCreated++;
          }
          
        } catch (researchError) {
          console.warn(`   - Warning: Could not create research submission ${presentationData.title}: ${researchError.message}`);
          this.stats.errors.push(`Research (${presentationData.title}): ${researchError.message}`);
        }
      }
      
      console.log(`   - Research submissions created: ${this.stats.researchCreated}`);
      
    } catch (error) {
      console.error('❌ Research submission creation failed:', error);
      this.stats.errors.push(`Research creation: ${error.message}`);
    }
  }

  /**
   * Map session names to categories
   */
  mapSessionCategory(sessionName) {
    const name = sessionName.toLowerCase();
    if (name.includes('pedagogy')) return 'Pedagogy';
    if (name.includes('student')) return 'Student Research';
    if (name.includes('analytics')) return 'Analytics';
    if (name.includes('economics')) return 'Economics';
    if (name.includes('finance')) return 'Finance';
    if (name.includes('management')) return 'Management';
    if (name.includes('keynote')) return 'Keynote';
    if (name.includes('plenary')) return 'Plenary';
    return 'General Business';
  }

  /**
   * Map session types to tracks
   */
  mapSessionTrack(sessionType) {
    const type = sessionType.toLowerCase();
    if (type.includes('keynote')) return 'keynote';
    if (type.includes('student')) return 'student';
    if (type.includes('workshop')) return 'workshop';
    if (type.includes('research')) return 'research';
    return 'general';
  }

  /**
   * Map presentation types
   */
  mapPresentationType(presentationType) {
    const type = (presentationType || '').toLowerCase();
    if (type.includes('poster')) return 'poster';
    if (type.includes('keynote')) return 'keynote';
    if (type.includes('workshop')) return 'workshop';
    return 'presentation';
  }

  /**
   * Generate migration report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      conference: {
        id: this.conference._id,
        title: this.conference.title,
        year: this.conference.year
      },
      statistics: this.stats,
      summary: {
        totalRecordsCreated: this.stats.usersCreated + this.stats.registrationsCreated + 
                           this.stats.sessionsCreated + this.stats.researchCreated,
        totalErrors: this.stats.errors.length,
        successRate: `${Math.round((1 - this.stats.errors.length / 
          (this.extractedData.attendees.length + this.extractedData.sessions.length + 
           this.extractedData.presentations.length)) * 100)}%`
      }
    };

    // Save report to file
    const reportPath = path.join(__dirname, 'migration-reports', `sobie-2023-migration-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📋 Migration Report');
    console.log('==================');
    console.log(`Conference: ${report.conference.title} (${report.conference.year})`);
    console.log(`Users Created: ${this.stats.usersCreated}`);
    console.log(`Users Updated: ${this.stats.usersUpdated}`);
    console.log(`Registrations Created: ${this.stats.registrationsCreated}`);
    console.log(`Sessions Created: ${this.stats.sessionsCreated}`);
    console.log(`Research Submissions Created: ${this.stats.researchCreated}`);
    console.log(`Total Records Created: ${report.summary.totalRecordsCreated}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`Report saved to: ${reportPath}`);

    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      this.stats.errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
      if (this.stats.errors.length > 5) {
        console.log(`   ... and ${this.stats.errors.length - 5} more errors (see report file)`);
      }
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new SOBIE2023Migrator();
  migrator.migrate()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = SOBIE2023Migrator;
