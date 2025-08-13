const mongoose = require('mongoose');
const User = require('./src/models/User');
const profileController = require('./src/controllers/profileController');
require('dotenv').config();

async function testSobieHistoryAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find a historical user to test with
    const testUser = await User.findOne({ 
      isHistoricalData: true,
      'sobieHistory.attendance': { $exists: true, $not: { $size: 0 } }
    });
    
    if (!testUser) {
      console.log('❌ No historical users with conference history found');
      return;
    }
    
    console.log('🧪 Testing SOBIE History API');
    console.log('============================');
    console.log(`📋 Test User: ${testUser.name.firstName} ${testUser.name.lastName}`);
    console.log(`📅 Conference Years: ${testUser.sobieHistory.attendance.map(a => a.year).join(', ')}`);
    
    // Mock the authenticated user for testing
    const mockReq = {
      user: testUser
    };
    
    // Mock response object
    const mockRes = {
      status: (code) => ({ 
        json: (data) => {
          console.log('\n📊 SOBIE History API Response:');
          console.log('===============================');
          if (data.success && data.data) {
            console.log(`✅ Success: ${data.success}`);
            console.log(`📈 Statistics:`);
            console.log(`   Total Presentations: ${data.data.statistics.totalPresentations}`);
            console.log(`   Total Attendance: ${data.data.statistics.totalAttendance}`);
            console.log(`   Total Service: ${data.data.statistics.totalService}`);
            console.log(`   Years Active: ${data.data.statistics.yearsActive.join(', ')}`);
            
            if (data.data.manualHistory && data.data.manualHistory.attendance.length > 0) {
              console.log(`\n📅 Conference Attendance History:`);
              data.data.manualHistory.attendance.forEach((record, index) => {
                console.log(`   ${index + 1}. ${record.year} - Role: ${record.role}`);
              });
            }
            
            console.log(`\n📋 Summary:`);
            console.log(`   Total Contributions: ${data.data.summary.totalContributions}`);
            console.log(`   Years Active: ${data.data.summary.yearsActive}`);
            console.log(`   First Year: ${data.data.summary.firstYear}`);
            console.log(`   Most Recent Year: ${data.data.summary.mostRecentYear}`);
            
            console.log('\n✅ Historical users CAN view their conference activity!');
          } else {
            console.log('❌ API Error:', data);
          }
        }
      })
    };
    
    // Call the SOBIE history endpoint
    await profileController.getMySobieHistory(mockReq, mockRes);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSobieHistoryAPI();
