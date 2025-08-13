const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

/**
 * Enhanced Migration - Add Conference History to Existing Historical Users
 * This script populates the sobieHistory field for users who were migrated without conference activity
 */

async function enhanceHistoricalUsersWithConferenceHistory() {
  try {
    console.log('🚀 Starting Enhanced Historical User Migration');
    console.log('='.repeat(60));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
    
    // Find all historical users without SOBIE history
    const historicalUsers = await User.find({
      isHistoricalData: true,
      $or: [
        { sobieHistory: { $exists: false } },
        { 'sobieHistory.attendance': { $exists: false } },
        { 'sobieHistory.attendance': { $size: 0 } }
      ]
    });
    
    console.log(`\n📊 Found ${historicalUsers.length} historical users without conference history`);
    
    let updatedCount = 0;
    const updateStats = {
      2009: 0,
      2019: 0,
      2022: 0,
      2023: 0
    };
    
    for (const user of historicalUsers) {
      try {
        // Extract year from historical data notes
        const yearMatch = user.historicalDataNotes.match(/SOBIE (\d{4})/);
        if (!yearMatch) {
          console.warn(`⚠️ Could not extract year from: ${user.historicalDataNotes}`);
          continue;
        }
        
        const conferenceYear = parseInt(yearMatch[1]);
        
        // Create or update SOBIE history
        const sobieHistory = {
          attendance: [{
            year: conferenceYear,
            role: 'attendee',
            sessionsAttended: []
          }],
          service: user.sobieHistory?.service || [],
          publications: user.sobieHistory?.publications || []
        };
        
        // Update user with conference history
        await User.findByIdAndUpdate(user._id, {
          sobieHistory: sobieHistory,
          $set: {
            'privacySettings.sobieHistory.attendance': true,
            'privacySettings.sobieHistory.service': true,
            'privacySettings.sobieHistory.publications': true
          }
        });
        
        updatedCount++;
        updateStats[conferenceYear]++;
        
        if (updatedCount % 50 === 0) {
          console.log(`   📈 Progress: ${updatedCount}/${historicalUsers.length} users updated`);
        }
        
      } catch (userError) {
        console.error(`❌ Error updating user ${user.name.firstName} ${user.name.lastName}: ${userError.message}`);
      }
    }
    
    console.log('\n✅ Enhanced Migration Complete!');
    console.log('='.repeat(60));
    console.log(`📊 Total users updated: ${updatedCount}`);
    console.log('\n📅 Updated by year:');
    Object.entries(updateStats).forEach(([year, count]) => {
      console.log(`   ${year}: ${count} users`);
    });
    
    // Verify the changes
    console.log('\n🔍 Verification - Sample Enhanced User:');
    const sampleUser = await User.findOne({
      isHistoricalData: true,
      'sobieHistory.attendance': { $exists: true, $not: { $size: 0 } }
    });
    
    if (sampleUser) {
      console.log(`   📋 ${sampleUser.name.firstName} ${sampleUser.name.lastName}`);
      console.log(`   🏛️ ${sampleUser.affiliation.organization}`);
      console.log(`   📅 Conference History: ${sampleUser.sobieHistory.attendance.length} records`);
      sampleUser.sobieHistory.attendance.forEach(record => {
        console.log(`      - ${record.year}: ${record.role}`);
      });
    }
    
    await mongoose.disconnect();
    console.log('\n🎉 Enhanced migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Enhanced migration failed:', error);
    process.exit(1);
  }
}

// Run the enhancement if this file is executed directly
if (require.main === module) {
  enhanceHistoricalUsersWithConferenceHistory();
}

module.exports = enhanceHistoricalUsersWithConferenceHistory;
