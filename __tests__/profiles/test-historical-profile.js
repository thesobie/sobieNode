const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function testHistoricalUserProfile() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find a historical user
    const historicalUser = await User.findOne({ 
      isHistoricalData: true,
      historicalDataNotes: /SOBIE 2023/
    });
    
    if (!historicalUser) {
      console.log('❌ No historical users found');
      return;
    }
    
    console.log('🔍 Historical User Profile Analysis');
    console.log('================================');
    console.log(`📋 User: ${historicalUser.name.firstName} ${historicalUser.name.lastName}`);
    console.log(`🏛️ Organization: ${historicalUser.affiliation.organization}`);
    console.log(`📅 Source: ${historicalUser.historicalDataNotes}`);
    console.log(`🔗 Historical Data Flag: ${historicalUser.isHistoricalData}`);
    
    // Check if they have SOBIE history
    console.log('\n📊 Conference History Available:');
    if (historicalUser.sobieHistory) {
      console.log(`   Attendance Records: ${historicalUser.sobieHistory.attendance?.length || 0}`);
      console.log(`   Service Records: ${historicalUser.sobieHistory.service?.length || 0}`);
      console.log(`   Publication Records: ${historicalUser.sobieHistory.publications?.length || 0}`);
      
      if (historicalUser.sobieHistory.attendance?.length > 0) {
        console.log('\n   📅 Attendance History:');
        historicalUser.sobieHistory.attendance.forEach((record, index) => {
          console.log(`      ${index + 1}. ${record.year} - Role: ${record.role || 'attendee'}`);
        });
      }
    } else {
      console.log('   ❌ No SOBIE history records found');
    }
    
    // Check privacy settings for history display
    console.log('\n🔒 Privacy Settings for History:');
    if (historicalUser.privacySettings?.sobieHistory) {
      console.log(`   Attendance Visible: ${historicalUser.privacySettings.sobieHistory.attendance}`);
      console.log(`   Service Visible: ${historicalUser.privacySettings.sobieHistory.service}`);
      console.log(`   Publications Visible: ${historicalUser.privacySettings.sobieHistory.publications}`);
    } else {
      console.log('   ❌ Privacy settings not configured');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testHistoricalUserProfile();
