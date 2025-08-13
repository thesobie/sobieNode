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
 * Multi-Year SOBIE Historical Data Migration
 * Processes multiple conference years in batch
 */
class MultiYearSOBIEMigrator {
  constructor() {
    this.conferenceYears = [
      {
        year: 2022,
        edition: '24th Annual',
        pdfPath: 'uploads/documents/2022/program/sobie-2022-program.pdf',
        dates: { start: new Date('2022-04-13'), end: new Date('2022-04-15') }
      },
      {
        year: 2019,
        edition: '21st Annual',
        pdfPath: 'uploads/documents/2019/program/sobie-2019-program.pdf',
        dates: { start: new Date('2019-04-10'), end: new Date('2019-04-12') }
      },
      {
        year: 2009,
        edition: '11th Annual',
        pdfPath: 'uploads/documents/2009/program/sobie-2009-program.pdf',
        dates: { start: new Date('2009-04-15'), end: new Date('2009-04-17') }
      }
    ];
    
    this.totalStats = {
      conferencesProcessed: 0,
      conferencesCreated: 0,
      totalUsersCreated: 0,
      totalUsersUpdated: 0,
      totalRegistrationsCreated: 0,
      totalSessionsCreated: 0,
      totalErrors: 0,
      yearlyResults: []
    };
  }

  /**
   * Main migration process for all years
   */
  async migrateAllYears() {
    try {
      console.log('🚀 Starting Multi-Year SOBIE Historical Data Migration');
      console.log('========================================================');
      console.log(`Processing ${this.conferenceYears.length} conference years: ${this.conferenceYears.map(c => c.year).join(', ')}`);
      console.log('');
      
      // Connect to database
      await this.connectDatabase();
      
      // Process each year
      for (const conferenceConfig of this.conferenceYears) {
        try {
          console.log(`\n🎯 Processing SOBIE ${conferenceConfig.year}`);
          console.log('='.repeat(40));
          
          const yearResult = await this.processSingleYear(conferenceConfig);
          this.totalStats.yearlyResults.push(yearResult);
          
          // Update total stats
          this.totalStats.conferencesProcessed++;
          this.totalStats.conferencesCreated += yearResult.stats.conferenceCreated;
          this.totalStats.totalUsersCreated += yearResult.stats.usersCreated;
          this.totalStats.totalUsersUpdated += yearResult.stats.usersUpdated;
          this.totalStats.totalRegistrationsCreated += yearResult.stats.registrationsCreated;
          this.totalStats.totalSessionsCreated += yearResult.stats.sessionsCreated;
          this.totalStats.totalErrors += yearResult.stats.errors.length;
          
        } catch (yearError) {
          console.error(`❌ Failed to process SOBIE ${conferenceConfig.year}:`, yearError.message);
          this.totalStats.yearlyResults.push({
            year: conferenceConfig.year,
            success: false,
            error: yearError.message,
            stats: { errors: [yearError.message] }
          });
        }
      }
      
      // Generate comprehensive report
      await this.generateComprehensiveReport();
      
      console.log('\n✅ Multi-Year Migration Completed!');
      
    } catch (error) {
      console.error('❌ Multi-Year Migration failed:', error);
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
   * Process a single conference year
   */
  async processSingleYear(conferenceConfig) {
    const yearStats = {
      conferenceCreated: 0,
      usersCreated: 0,
      usersUpdated: 0,
      registrationsCreated: 0,
      sessionsCreated: 0,
      errors: []
    };

    try {
      // Check if PDF file exists
      const pdfPath = path.join(__dirname, conferenceConfig.pdfPath);
      try {
        await fs.access(pdfPath);
      } catch {
        throw new Error(`PDF file not found: ${conferenceConfig.pdfPath}`);
      }

      // Extract data from PDF
      console.log('📄 Extracting data from PDF...');
      const parser = new SOBIEProgramParser();
      const extractedData = await parser.parseProgramPDF(pdfPath);
      
      console.log(`   ✅ PDF extraction successful:`);
      console.log(`      - Attendees found: ${extractedData.attendees.length}`);
      console.log(`      - Sessions found: ${extractedData.sessions.length}`);

      // Create conference record
      const conference = await this.createConference(conferenceConfig, yearStats);
      
      // Create users
      const users = await this.createUsers(extractedData, conferenceConfig.year, yearStats);
      
      // Create registrations
      await this.createRegistrations(users, conference, conferenceConfig.year, yearStats);
      
      // Create sessions
      await this.createSessions(extractedData, conference, conferenceConfig.year, yearStats);

      return {
        year: conferenceConfig.year,
        success: true,
        stats: yearStats,
        extractedData: {
          attendeesCount: extractedData.attendees.length,
          sessionsCount: extractedData.sessions.length
        }
      };

    } catch (error) {
      yearStats.errors.push(`Year ${conferenceConfig.year} processing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create conference record for a specific year
   */
  async createConference(conferenceConfig, yearStats) {
    try {
      console.log('🏛️ Creating conference record...');
      
      // Check if conference already exists
      let conference = await Conference.findOne({
        year: conferenceConfig.year
      });

      if (!conference) {
        conference = await Conference.create({
          // Required fields
          name: 'SOBIE',
          fullName: 'Society of Business, Industry & Economics',
          year: conferenceConfig.year,
          edition: conferenceConfig.edition,
          startDate: conferenceConfig.dates.start,
          endDate: conferenceConfig.dates.end,
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
          historicalDataSource: 'conference_papers',
          historicalDataNotes: `Extracted from SOBIE ${conferenceConfig.year} conference program PDF`,
          migrationDate: new Date()
        });
        
        yearStats.conferenceCreated = 1;
        console.log(`   ✅ Conference created: ${conference.fullName} (${conference.year})`);
      } else {
        console.log(`   ℹ️ Conference already exists: ${conference.fullName} (${conference.year})`);
      }

      return conference;
      
    } catch (error) {
      yearStats.errors.push(`Conference creation (${conferenceConfig.year}): ${error.message}`);
      throw new Error(`Conference creation failed: ${error.message}`);
    }
  }

  /**
   * Create users from extracted attendee data
   */
  async createUsers(extractedData, year, yearStats) {
    try {
      console.log('👥 Creating user profiles...');
      const users = [];
      
      for (const attendeeData of extractedData.attendees) {
        try {
          // Handle the actual data structure from the parser
          const firstName = attendeeData.name?.first || 'Unknown';
          const lastName = attendeeData.name?.last || 'User';
          const fullName = attendeeData.fullName || `${firstName} ${lastName}`;
          const email = this.generateUniqueEmail(fullName, attendeeData.affiliation, year);
          
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
              historicalDataSource: 'conference_papers',
              historicalDataNotes: `Extracted from SOBIE ${year} conference program PDF`,
              migrationDate: new Date()
            };

            const newUser = await User.create(userData);
            users.push(newUser);
            yearStats.usersCreated++;
          } else {
            users.push(existingUser);
            yearStats.usersUpdated++;
          }
          
        } catch (userError) {
          console.warn(`   - Warning: Could not create user ${attendeeData.fullName || 'Unknown'}: ${userError.message}`);
          yearStats.errors.push(`User creation (${attendeeData.fullName || 'Unknown'}): ${userError.message}`);
        }
      }
      
      console.log(`   ✅ Users created: ${yearStats.usersCreated}`);
      console.log(`   ✅ Users updated: ${yearStats.usersUpdated}`);
      
      return users;
      
    } catch (error) {
      yearStats.errors.push(`User creation (${year}): ${error.message}`);
      throw error;
    }
  }

  /**
   * Create conference registrations (simplified for historical data)
   */
  async createRegistrations(users, conference, year, yearStats) {
    try {
      console.log('📝 Creating conference registrations...');
      
      // For historical data, we'll create simplified registrations
      // Skip the complex validation requirements for now
      console.log(`   ℹ️ Skipping detailed registrations for historical data (${users.length} users would be registered)`);
      yearStats.registrationsCreated = 0; // Could be users.length if we implement full registration
      
    } catch (error) {
      yearStats.errors.push(`Registration creation (${year}): ${error.message}`);
    }
  }

  /**
   * Create session records (simplified for historical data)
   */
  async createSessions(extractedData, conference, year, yearStats) {
    try {
      console.log('🎯 Creating session records...');
      
      // For historical data, create basic session records
      for (let i = 0; i < Math.min(extractedData.sessions.length, 10); i++) { // Limit to 10 sessions for demo
        const sessionData = extractedData.sessions[i];
        try {
          const sessionTitle = sessionData.name || `Session ${i + 1}`;
          const sessionDescription = sessionData.description || '';
          
          // Check if session already exists
          const existingSession = await Session.findOne({
            title: sessionTitle,
            conferenceId: conference._id
          });

          if (!existingSession) {
            await Session.create({
              // Required fields
              title: sessionTitle,
              sessionNumber: i + 1,
              conferenceYear: year,
              category: 'general',
              location: {
                room: 'Terrace 1' // Default room
              },
              
              // Optional fields
              conferenceId: conference._id,
              description: sessionDescription,
              type: sessionData.type || 'presentation',
              date: conference.startDate,
              startTime: '09:00',
              endTime: '10:30',
              
              // Historical data flags
              isHistoricalData: true,
              historicalDataSource: 'conference_papers',
              historicalDataNotes: `Extracted from SOBIE ${year} conference program PDF`,
              migrationDate: new Date()
            });
            
            yearStats.sessionsCreated++;
          }
          
        } catch (sessionError) {
          yearStats.errors.push(`Session creation (${sessionData.name || i + 1}, ${year}): ${sessionError.message}`);
        }
      }
      
      console.log(`   ✅ Sessions created: ${yearStats.sessionsCreated}`);
      
    } catch (error) {
      yearStats.errors.push(`Session creation (${year}): ${error.message}`);
    }
  }

  /**
   * Generate unique email for historical users
   */
  generateUniqueEmail(name, affiliation, year) {
    const cleanName = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.');
    
    const timestamp = Date.now().toString().slice(-6);
    return `${cleanName}.${year}.${timestamp}@sobie.historical`;
  }

  /**
   * Generate comprehensive report for all years
   */
  async generateComprehensiveReport() {
    const report = {
      migrationDate: new Date(),
      totalStats: this.totalStats,
      yearlyBreakdown: this.totalStats.yearlyResults,
      summary: {
        successfulYears: this.totalStats.yearlyResults.filter(r => r.success).length,
        failedYears: this.totalStats.yearlyResults.filter(r => !r.success).length,
        totalAttendeesProcessed: this.totalStats.yearlyResults.reduce((sum, r) => 
          sum + (r.extractedData?.attendeesCount || 0), 0),
        totalSessionsProcessed: this.totalStats.yearlyResults.reduce((sum, r) => 
          sum + (r.extractedData?.sessionsCount || 0), 0)
      }
    };

    // Save report to file
    const reportsDir = path.join(__dirname, 'migration-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportFile = path.join(reportsDir, `multi-year-migration-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

    console.log('\n📋 Multi-Year Migration Report');
    console.log('===============================');
    console.log(`Total Conferences Processed: ${this.totalStats.conferencesProcessed}`);
    console.log(`Total Conferences Created: ${this.totalStats.conferencesCreated}`);
    console.log(`Total Users Created: ${this.totalStats.totalUsersCreated}`);
    console.log(`Total Users Updated: ${this.totalStats.totalUsersUpdated}`);
    console.log(`Total Sessions Created: ${this.totalStats.totalSessionsCreated}`);
    console.log(`Total Attendees Processed: ${report.summary.totalAttendeesProcessed}`);
    console.log(`Total Sessions Processed: ${report.summary.totalSessionsProcessed}`);
    console.log(`Successful Years: ${report.summary.successfulYears}/${this.totalStats.conferencesProcessed}`);
    console.log(`Report saved to: ${reportFile}`);
    
    if (this.totalStats.totalErrors > 0) {
      console.log(`\n⚠️  Total Errors: ${this.totalStats.totalErrors}`);
    }

    // Display yearly summary
    console.log('\n📊 Yearly Summary:');
    console.log('==================');
    this.totalStats.yearlyResults.forEach(yearResult => {
      if (yearResult.success) {
        console.log(`✅ SOBIE ${yearResult.year}: ${yearResult.stats.usersCreated} users, ${yearResult.stats.sessionsCreated} sessions`);
      } else {
        console.log(`❌ SOBIE ${yearResult.year}: Failed - ${yearResult.error}`);
      }
    });
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new MultiYearSOBIEMigrator();
  migrator.migrateAllYears().catch(console.error);
}

module.exports = MultiYearSOBIEMigrator;
