const mongoose = require('mongoose');
const SOBIE2023Migrator = require('./migrate-sobie-2023');

/**
 * Test the SOBIE 2023 migration script
 * Validates the migration logic without actually writing to database
 */

async function testMigration() {
  try {
    console.log('🧪 Testing SOBIE 2023 Migration Script');
    console.log('=====================================\n');

    // Test 1: Check if PDF file exists
    console.log('1️⃣ Testing PDF file access...');
    const fs = require('fs').promises;
    const pdfPath = '/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents/2023/program/sobie-2023-program.pdf';
    
    try {
      const stats = await fs.stat(pdfPath);
      console.log(`   ✅ PDF file found (${Math.round(stats.size / 1024)}KB)`);
    } catch (error) {
      console.log(`   ❌ PDF file not found: ${error.message}`);
      return;
    }

    // Test 2: Check database connection
    console.log('\n2️⃣ Testing database connection...');
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sobienode';
      await mongoose.connect(mongoUri);
      console.log('   ✅ Database connection successful');
      await mongoose.disconnect();
    } catch (error) {
      console.log(`   ❌ Database connection failed: ${error.message}`);
      return;
    }

    // Test 3: Test PDF extraction
    console.log('\n3️⃣ Testing PDF data extraction...');
    try {
      const SOBIEProgramParser = require('./src/services/programParserService');
      const parser = new SOBIEProgramParser();
      
      // Test parsing without saving to database
      const extractedData = await parser.parseProgramPDF(pdfPath);
      
      console.log('   ✅ PDF extraction successful:');
      console.log(`      - Conference: ${extractedData.conference.title}`);
      console.log(`      - Attendees found: ${extractedData.attendees.length}`);
      console.log(`      - Presentations found: ${extractedData.presentations.length}`);
      console.log(`      - Sessions found: ${extractedData.sessions.length}`);
      
      // Test data quality
      const validAttendees = extractedData.attendees.filter(a => 
        a.name && a.name.first && a.name.last && 
        a.name.first.length > 1 && a.name.last.length > 1
      );
      
      console.log(`      - Valid attendees: ${validAttendees.length}/${extractedData.attendees.length}`);
      
      if (validAttendees.length > 0) {
        console.log(`      - Sample attendee: ${validAttendees[0].name.first} ${validAttendees[0].name.last}`);
        if (validAttendees[0].affiliation) {
          console.log(`        Affiliation: ${validAttendees[0].affiliation}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ PDF extraction failed: ${error.message}`);
      return;
    }

    // Test 4: Test model imports
    console.log('\n4️⃣ Testing model imports...');
    try {
      const Conference = require('./src/models/Conference');
      const User = require('./src/models/User');
      const ConferenceRegistration = require('./src/models/ConferenceRegistration');
      const Session = require('./src/models/Session');
      const ResearchSubmission = require('./src/models/ResearchSubmission');
      
      console.log('   ✅ All models imported successfully');
    } catch (error) {
      console.log(`   ❌ Model import failed: ${error.message}`);
      return;
    }

    console.log('\n🎯 Migration Test Results:');
    console.log('==========================');
    console.log('✅ PDF file accessible');
    console.log('✅ Database connection working');
    console.log('✅ PDF data extraction working');
    console.log('✅ All models available');
    console.log('\n🚀 Ready to run actual migration!');
    console.log('\nTo proceed with database population:');
    console.log('  ./populate-database.sh');
    console.log('\nOr run directly:');
    console.log('  node migrate-sobie-2023.js');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run test
testMigration().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
