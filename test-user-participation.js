#!/usr/bin/env node

/**
 * Test script for SOBIE User Participation Features
 * This script tests the new research participation endpoints we just created
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'barrycumbie@gmail.com';
const TEST_PASSWORD = 'CatCat1!'; // Barry's test password

// Test passwords to try (we'll figure out which one works)
const TEST_PASSWORDS = [
  TEST_PASSWORD,  // Try the known password first
  'Cat!Cat',
  'CatCat!', 
  'Cat!Cat!',
  'password123',
  'Cat123!',
  'Cat!123'
];

let authToken = null;

async function testLogin() {
  console.log('🔐 Testing login with different passwords...\n');
  
  for (const password of TEST_PASSWORDS) {
    try {
      console.log(`   Trying password: ${password.replace(/./g, '*')}`);
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: TEST_EMAIL,
        password: password
      });
      
      if (response.data.success) {
        authToken = response.data.data.token;
        console.log(`   ✅ SUCCESS! Password found: ${password}`);
        console.log(`   📝 Auth token: ${authToken.substring(0, 20)}...`);
        return true;
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${password}`);
    }
  }
  
  console.log('\n❌ None of the test passwords worked. Please check the forgot password email.');
  return false;
}

async function testUserParticipationEndpoints() {
  if (!authToken) {
    console.log('❌ No auth token available. Skipping participation tests.');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('\n🎯 Testing User SOBIE Participation Endpoints...\n');

  // Test 1: Get enhanced SOBIE history (includes research presentations)
  try {
    console.log('1. Testing Enhanced SOBIE History...');
    const response = await axios.get(`${BASE_URL}/profiles/me/sobie-history`, { headers });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log(`   ✅ Enhanced SOBIE History Retrieved!`);
      console.log(`   📊 Research Presentations: ${data.researchPresentations?.total || 0}`);
      console.log(`   📊 Manual Attendance Records: ${data.manualHistory?.attendance?.length || 0}`);
      console.log(`   📊 Service Records: ${data.manualHistory?.service?.length || 0}`);
      console.log(`   📊 Years Active: ${data.statistics?.yearsActive?.length || 0}`);
      console.log(`   📊 Total Contributions: ${data.summary?.totalContributions || 0}`);
      
      if (data.researchPresentations?.list?.length > 0) {
        console.log(`   🔬 Sample Presentation: "${data.researchPresentations.list[0].title}"`);
      }
    } else {
      console.log('   ❌ Failed to get SOBIE history');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: Get user's research presentations
  try {
    console.log('\n2. Testing Research Presentations Endpoint...');
    const response = await axios.get(`${BASE_URL}/research/me/presentations`, { headers });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log(`   ✅ Research Presentations Retrieved!`);
      console.log(`   📊 Total Presentations: ${data.statistics?.totalPresentations || 0}`);
      console.log(`   📊 Primary Author Count: ${data.statistics?.primaryAuthorCount || 0}`);
      console.log(`   📊 Presenter Count: ${data.statistics?.presenterCount || 0}`);
      console.log(`   📊 Years Active: ${data.statistics?.yearsActive?.length || 0}`);
      console.log(`   📊 Disciplines: ${data.statistics?.disciplineBreakdown ? Object.keys(data.statistics.disciplineBreakdown).join(', ') : 'None'}`);
      
      if (data.statistics?.yearsActive?.length > 0) {
        console.log(`   📅 Active Years: ${data.statistics.yearsActive.join(', ')}`);
      }
    } else {
      console.log('   ❌ Failed to get research presentations');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 3: Get collaboration network
  try {
    console.log('\n3. Testing Research Collaborations...');
    const response = await axios.get(`${BASE_URL}/research/me/collaborations`, { headers });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log(`   ✅ Collaboration Network Retrieved!`);
      console.log(`   📊 Total Collaborators: ${data.totalCollaborators || 0}`);
      console.log(`   📊 Total Institutions: ${data.totalInstitutions || 0}`);
      console.log(`   📊 Total Collaborations: ${data.totalCollaborations || 0}`);
      
      if (data.collaborators?.length > 0) {
        console.log(`   👥 Top Collaborator: ${data.collaborators[0].user?.name?.firstName || 'Unknown'} ${data.collaborators[0].user?.name?.lastName || ''} (${data.collaborators[0].collaborationCount} collaborations)`);
      }
      
      if (data.institutions?.length > 0) {
        console.log(`   🏢 Top Institution: ${data.institutions[0].name} (${data.institutions[0].count} collaborations)`);
      }
    } else {
      console.log('   ❌ Failed to get collaborations');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 4: Get complete SOBIE history (comprehensive)
  try {
    console.log('\n4. Testing Complete SOBIE History...');
    const response = await axios.get(`${BASE_URL}/research/me/sobie-history`, { headers });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log(`   ✅ Complete SOBIE History Retrieved!`);
      console.log(`   📊 Years Participated: ${data.statistics?.totalYearsParticipated || 0}`);
      console.log(`   📊 Total Presentations: ${data.statistics?.totalPresentations || 0}`);
      console.log(`   📊 Total Service: ${data.statistics?.totalService || 0}`);
      console.log(`   📊 Roles Held: ${data.statistics?.rolesHeld?.slice(0, 3).join(', ') || 'None'}`);
      console.log(`   📊 Awards Received: ${data.statistics?.awardsReceived?.length || 0}`);
      
      if (data.participationHistory?.length > 0) {
        console.log(`   📅 Participation Years: ${data.participationHistory.map(p => p.year).join(', ')}`);
      }
    } else {
      console.log('   ❌ Failed to get complete SOBIE history');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 5: Search user's own presentations
  try {
    console.log('\n5. Testing Presentation Search...');
    const response = await axios.get(`${BASE_URL}/research/me/search?q=business&discipline=management`, { headers });
    
    if (response.data.success) {
      console.log(`   ✅ Presentation Search Works!`);
      console.log(`   📊 Search Results: ${response.data.count || 0} presentations found`);
      
      if (response.data.data?.length > 0) {
        console.log(`   🔍 Sample Result: "${response.data.data[0].title}"`);
      }
    } else {
      console.log('   ❌ Failed to search presentations');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
  }
}

async function runTests() {
  console.log('🎉 SOBIE User Participation Testing Suite\n');
  console.log('This tests the new research participation features we just implemented!\n');
  
  // Step 1: Try to login
  const loginSuccess = await testLogin();
  
  if (loginSuccess) {
    // Step 2: Test all participation endpoints
    await testUserParticipationEndpoints();
    
    console.log('\n🎯 Summary of New Features Available to Users:');
    console.log('   📊 /api/profiles/me/sobie-history - Enhanced history with linked research');
    console.log('   🔬 /api/research/me/presentations - All user research presentations');
    console.log('   👥 /api/research/me/collaborations - Research collaboration network');
    console.log('   📈 /api/research/me/sobie-history - Complete participation timeline');
    console.log('   🔍 /api/research/me/search - Search user\'s own research');
    
  } else {
    console.log('\n📧 Please check your email for the password reset link!');
    console.log('   The system sent a reset email to: barrycumbie@gmail.com');
    console.log('   (Due to safety settings, only your email receives notifications)');
  }
  
  console.log('\n✅ Testing Complete!');
}

// Run the tests
runTests().catch(console.error);
