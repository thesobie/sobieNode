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
 * SOBIE 2023 Historical Data Migration (Fixed Version)
 * Handles validation requirements and creates simplified historical records
 */
class SOBIE2023MigratorFixed {
  constructor() {
    this.stats = {
      conferenceCreated: 0,
      usersCreated: 0,
      usersUpdated: 0,
      registrationsCreated: 0,
      sessionsCreated: 0,
      researchSubmissionsCreated: 0,
      errors: []
    };
    
    this.conference = null;
    this.users = [];
    this.sessions = [];
    this.extractedData = null;
  }

  /**
   * Main migration process
   */
  async migrate() {
    try {
      console.log('🧪 Starting SOBIE 2023 Historical Data Migration (Fixed)');
      console.log('===========================================================');
      
      // Connect to database
      await this.connectDatabase();
      
      // Extract data from PDF
      await this.extractDataFromPDF();
      
      // Create conference record
      await this.createConference();
      
      // Create simplified user profiles (historical data)
      await this.createUsers();
      
      // Create conference registrations
      await this.createRegistrations();
      
      // Create session records
      await this.createSessions();
      
      // Generate final report
      await this.generateReport();
      
      console.log('✅ Migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.stats.errors.push(`Migration: ${error.message}`);
    } finally {
      await mongoose.disconnect();
    }
  }

  /**
   * Connect to MongoDB database
   */
  async connectDatabase() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ Database connected successfully');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * Extract data from SOBIE 2023 PDF using the parser service
   */
  async extractDataFromPDF() {
    try {
      console.log('📄 Extracting data from SOBIE 2023 PDF...');
      
      const pdfPath = path.join(__dirname, 'uploads/documents/2023/program/sobie-2023-program.pdf');
      const parser = new SOBIEProgramParser();
      
      this.extractedData = await parser.parseProgramPDF(pdfPath);
      
      console.log(`   ✅ PDF extraction successful:`);
      console.log(`      - Conference: ${this.extractedData.conference.title}`);
      console.log(`      - Attendees found: ${this.extractedData.attendees.length}`);
      console.log(`      - Sessions found: ${this.extractedData.sessions.length}`);
      
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  /**
   * Create conference record
   */
  async createConference() {
    try {
      console.log('🏛️ Creating conference record...');
      
      // Check if conference already exists
      this.conference = await Conference.findOne({
        year: 2023
      });

      if (!this.conference) {
        this.conference = await Conference.create({
          // Required fields
          name: 'SOBIE',
          fullName: 'Society of Business, Industry & Economics',
          year: 2023,
          edition: '25th Annual',
          startDate: new Date('2023-04-12'),
          endDate: new Date('2023-04-14'),
          location: {
            venue: 'Sandestin Golf and Beach Resort',
            address: {
              street: '9300 Emerald Coast Pkwy W',
              city: 'Miramar Beach',
              state: 'Florida',
              country: 'USA',
              zipCode: '32550'
            }
          },
          
          // Additional information
          theme: 'Excellence in Business, Industry & Economics',
          status: 'completed',
          isActive: false,
          
          // Historical data flags
          isHistoricalData: true,
          dataSource: 'sobie-2023-pdf',
          migrationDate: new Date()
        });
        
        this.stats.conferenceCreated = 1;
        console.log(`   ✅ Conference created: ${this.conference.fullName} (${this.conference.year})`);
      } else {
        console.log(`   ℹ️ Conference already exists: ${this.conference.fullName} (${this.conference.year})`);
      }
      
    } catch (error) {
      throw new Error(`Conference creation failed: ${error.message}`);
    }
  }

  /**
   * Create simplified user profiles for historical data
   */
  async createUsers() {
    try {
      console.log('👥 Creating simplified user profiles...');
      
      for (const attendeeData of this.extractedData.attendees) {
        try {
          // Handle the actual data structure from the parser
          const firstName = attendeeData.name?.first || 'Unknown';
          const lastName = attendeeData.name?.last || 'User';
          const fullName = attendeeData.fullName || `${firstName} ${lastName}`;
          const email = this.generateUniqueEmail(fullName, attendeeData.affiliation);
          
          // Check if user already exists
          const existingUser = await User.findOne({ email: email });

          if (!existingUser) {
            // Create simplified user with minimal required fields
            const userData = {
              // Required authentication fields
              email: email,
              password: '$2b$10$dummyhashedpasswordforhistoricaldata123456789012345678901234567890123456789012345678901234567890',
              magicLinkEnabled: true,
              
              // Required name fields
              name: {
                firstName: firstName,
                lastName: lastName
              },
              
              // Required user type
              userType: 'academic',
              
              // Required affiliation
              affiliation: {
                organization: attendeeData.affiliation || 'Institution Not Specified'
              },
              
              // Default role
              roles: ['user'],
              
              // Historical data flags (required)
              isHistoricalData: true,
              historicalDataSource: 'conference_papers', // Required enum value
              historicalDataNotes: 'Extracted from SOBIE 2023 conference program PDF',
              dataSource: 'sobie-2023-pdf',
              migrationDate: new Date()
            };

            const newUser = await User.create(userData);
            this.users.push(newUser);
            this.stats.usersCreated++;
          } else {
            this.users.push(existingUser);
            this.stats.usersUpdated++;
          }
          
        } catch (userError) {
          console.warn(`   - Warning: Could not create user ${attendeeData.fullName || 'Unknown'}: ${userError.message}`);
          this.stats.errors.push(`User creation (${attendeeData.fullName || 'Unknown'}): ${userError.message}`);
        }
      }
      
      console.log(`   ✅ Users created: ${this.stats.usersCreated}`);
      console.log(`   ✅ Users updated: ${this.stats.usersUpdated}`);
      
    } catch (error) {
      console.error('❌ User creation failed:', error);
      this.stats.errors.push(`User creation: ${error.message}`);
    }
  }

  /**
   * Parse full name into components
   */
  parseFullName(fullName) {
    if (!fullName || typeof fullName !== 'string') {
      return { firstName: 'Unknown', lastName: 'User' };
    }
    
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length === 0) {
      return { firstName: 'Unknown', lastName: 'User' };
    } else if (parts.length === 1) {
      return { firstName: parts[0], lastName: 'Unknown' };
    } else {
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
      };
    }
  }

  /**
   * Generate unique email for historical users
   */
  generateUniqueEmail(name, affiliation) {
    const cleanName = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.');
    
    const timestamp = Date.now().toString().slice(-6);
    return `${cleanName}.${timestamp}@sobie2023.historical`;
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
            await ConferenceRegistration.create({
              userId: user._id,
              conferenceId: this.conference._id,
              status: 'confirmed',
              registrationDate: new Date('2023-04-01'), // Approximate registration date
              isHistoricalData: true,
              dataSource: 'sobie-2023-pdf',
              migrationDate: new Date()
            });
            
            this.stats.registrationsCreated++;
          }
          
        } catch (regError) {
          console.warn(`   - Warning: Could not create registration for user ${user.email}: ${regError.message}`);
          this.stats.errors.push(`Registration creation (${user.email}): ${regError.message}`);
        }
      }
      
      console.log(`   ✅ Registrations created: ${this.stats.registrationsCreated}`);
      
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
      
      for (let i = 0; i < this.extractedData.sessions.length; i++) {
        const sessionData = this.extractedData.sessions[i];
        try {
          // Handle the actual session data structure
          const sessionTitle = sessionData.name || `Session ${i + 1}`;
          const sessionDescription = sessionData.description || '';
          
          // Check if session already exists
          const existingSession = await Session.findOne({
            title: sessionTitle,
            conferenceId: this.conference._id
          });

          if (!existingSession) {
            await Session.create({
              // Required fields
              title: sessionTitle,
              sessionNumber: i + 1,
              conferenceYear: 2023,
              category: 'general',
              location: {
                room: 'Terrace 1' // Default room from the data
              },
              
              // Optional fields
              conferenceId: this.conference._id,
              description: sessionDescription,
              type: sessionData.type || 'presentation',
              track: 'general',
              date: new Date('2023-04-12'),
              startTime: '09:00',
              endTime: '10:30',
              
              // Historical data flags
              isHistoricalData: true,
              dataSource: 'sobie-2023-pdf',
              migrationDate: new Date()
            });
            
            this.stats.sessionsCreated++;
          }
          
        } catch (sessionError) {
          console.warn(`   - Warning: Could not create session ${sessionData.name || i + 1}: ${sessionError.message}`);
          this.stats.errors.push(`Session creation (${sessionData.name || i + 1}): ${sessionError.message}`);
        }
      }
      
      console.log(`   ✅ Sessions created: ${this.stats.sessionsCreated}`);
      
    } catch (error) {
      console.error('❌ Session creation failed:', error);
      this.stats.errors.push(`Session creation: ${error.message}`);
    }
  }

  /**
   * Generate migration report
   */
  async generateReport() {
    const report = {
      migrationDate: new Date(),
      conference: this.conference ? `${this.conference.title} (${this.conference.year})` : 'Not created',
      statistics: {
        conferenceCreated: this.stats.conferenceCreated,
        usersCreated: this.stats.usersCreated,
        usersUpdated: this.stats.usersUpdated,
        registrationsCreated: this.stats.registrationsCreated,
        sessionsCreated: this.stats.sessionsCreated,
        researchSubmissionsCreated: this.stats.researchSubmissionsCreated,
        totalRecordsCreated: this.stats.conferenceCreated + this.stats.usersCreated + 
                            this.stats.registrationsCreated + this.stats.sessionsCreated,
        errorCount: this.stats.errors.length
      },
      successRate: Math.round(((this.stats.conferenceCreated + this.stats.usersCreated + 
                               this.stats.registrationsCreated + this.stats.sessionsCreated) / 
                              (this.extractedData?.attendees?.length + this.extractedData?.sessions?.length + 1)) * 100) || 0,
      errors: this.stats.errors.slice(0, 10), // First 10 errors
      totalErrors: this.stats.errors.length
    };

    // Save report to file
    const reportsDir = path.join(__dirname, 'migration-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportFile = path.join(reportsDir, `sobie-2023-migration-fixed-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

    console.log('\n📋 Migration Report');
    console.log('==================');
    console.log(`Conference: ${report.conference}`);
    console.log(`Users Created: ${report.statistics.usersCreated}`);
    console.log(`Users Updated: ${report.statistics.usersUpdated}`);
    console.log(`Registrations Created: ${report.statistics.registrationsCreated}`);
    console.log(`Sessions Created: ${report.statistics.sessionsCreated}`);
    console.log(`Total Records Created: ${report.statistics.totalRecordsCreated}`);
    console.log(`Success Rate: ${report.successRate}%`);
    console.log(`Report saved to: ${reportFile}`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${this.stats.errors.length}`);
      this.stats.errors.slice(0, 5).forEach(error => {
        console.log(`   - ${error}`);
      });
      if (this.stats.errors.length > 5) {
        console.log(`   ... and ${this.stats.errors.length - 5} more errors (see report file)`);
      }
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new SOBIE2023MigratorFixed();
  migrator.migrate().catch(console.error);
}

module.exports = SOBIE2023MigratorFixed;
