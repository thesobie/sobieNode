#!/usr/bin/env node

/**
 * Admin Test Script for Conference Registration Management
 * Tests admin functionality for managing conference registrations
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'barrycumbie@gmail.com'; // Assuming Barry has admin role
const ADMIN_PASSWORD = 'CatCat1!';

let authToken = null;

async function adminLogin() {
  try {
    console.log('🔐 Logging in as Admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Admin login successful!');
      return true;
    }
  } catch (error) {
    console.log('❌ Admin login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testAdminConferenceManagement() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('\n🎯 TESTING ADMIN CONFERENCE MANAGEMENT\n');
  console.log('=' .repeat(80));

  // Test 1: Get registration statistics
  try {
    console.log('\n1. Getting Registration Statistics...');
    const currentYear = new Date().getFullYear();
    const response = await axios.get(`${BASE_URL}/conference/admin/stats?year=${currentYear}`, { headers });
    
    if (response.data.success) {
      const stats = response.data.data.statistics;
      console.log('✅ Registration Statistics Retrieved!');
      console.log(`\n📊 CONFERENCE YEAR: ${response.data.data.year}`);
      console.log(`   Total Registrations: ${stats.total || 0}`);
      console.log(`   Confirmed: ${stats.confirmed || 0}`);
      console.log(`   Pending: ${stats.pending || 0}`);
      console.log(`   Cancelled: ${stats.cancelled || 0}`);
      console.log(`   With Research Submissions: ${stats.withResearchSubmissions || 0}`);
      console.log(`   First Time Attendees: ${stats.firstTimeAttendees || 0}`);
      
      if (stats.total > 0) {
        const confirmationRate = ((stats.confirmed / stats.total) * 100).toFixed(1);
        const researchRate = ((stats.withResearchSubmissions / stats.total) * 100).toFixed(1);
        console.log(`\n📈 PERCENTAGES:`);
        console.log(`   Confirmation Rate: ${confirmationRate}%`);
        console.log(`   Research Submission Rate: ${researchRate}%`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: Get all registrations with filtering
  try {
    console.log('\n2. Getting All Registrations...');
    const response = await axios.get(`${BASE_URL}/conference/admin/registrations?limit=10&page=1`, { headers });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('✅ All Registrations Retrieved!');
      console.log(`   📋 Total Registrations: ${data.pagination.total}`);
      console.log(`   📄 Page: ${data.pagination.page} of ${data.pagination.pages}`);
      console.log(`   📊 Showing: ${data.registrations.length} registrations`);
      
      if (data.registrations.length > 0) {
        console.log(`\n📋 RECENT REGISTRATIONS:`);
        data.registrations.slice(0, 5).forEach((reg, index) => {
          console.log(`\n   ${index + 1}. ${reg.fullName}`);
          console.log(`      ID: ${reg.id}`);
          console.log(`      Email: ${reg.email}`);
          console.log(`      Organization: ${reg.organization}`);
          console.log(`      Status: ${reg.status}`);
          console.log(`      Confirmed: ${reg.confirmed ? 'Yes' : 'No'}`);
          console.log(`      Attendance: ${reg.attendanceType}`);
          console.log(`      Registered: ${new Date(reg.registeredDate).toLocaleDateString()}`);
          
          if (reg.personalInfo) {
            console.log(`      Phone: ${reg.personalInfo.phone || 'Not provided'}`);
          }
          
          if (reg.affiliation) {
            console.log(`      Department: ${reg.affiliation.department || 'Not provided'}`);
            console.log(`      Position: ${reg.affiliation.position || 'Not provided'}`);
          }
          
          if (reg.confirmation) {
            console.log(`      Confirmation Code: ${reg.confirmation.code}`);
            if (reg.confirmation.confirmedAt) {
              console.log(`      Confirmed At: ${new Date(reg.confirmation.confirmedAt).toLocaleDateString()}`);
            }
          }
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 3: Filter registrations by status
  try {
    console.log('\n3. Getting Confirmed Registrations...');
    const response = await axios.get(`${BASE_URL}/conference/admin/registrations?status=confirmed&limit=5`, { headers });
    
    if (response.data.success) {
      const confirmedRegs = response.data.data.registrations;
      console.log(`✅ Confirmed Registrations Retrieved!`);
      console.log(`   📋 Confirmed Count: ${confirmedRegs.length}`);
      
      if (confirmedRegs.length > 0) {
        console.log(`\n✅ CONFIRMED ATTENDEES:`);
        confirmedRegs.forEach((reg, index) => {
          console.log(`   ${index + 1}. ${reg.fullName} (${reg.organization})`);
          console.log(`      Email: ${reg.email}`);
          console.log(`      Attendance: ${reg.attendanceType}`);
          console.log(`      Confirmed: ${new Date(reg.confirmation.confirmedAt).toLocaleDateString()}`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 4: Filter registrations by discipline
  try {
    console.log('\n4. Getting Information Systems Registrations...');
    const response = await axios.get(`${BASE_URL}/conference/admin/registrations?discipline=information_systems&limit=5`, { headers });
    
    if (response.data.success) {
      const isRegs = response.data.data.registrations;
      console.log(`✅ Information Systems Registrations Retrieved!`);
      console.log(`   📋 IS Registrations: ${isRegs.length}`);
      
      if (isRegs.length > 0) {
        console.log(`\n💻 INFORMATION SYSTEMS ATTENDEES:`);
        isRegs.forEach((reg, index) => {
          console.log(`   ${index + 1}. ${reg.fullName} (${reg.organization})`);
          console.log(`      Academic Level: ${reg.professionalInfo?.academicLevel || 'Not provided'}`);
          console.log(`      Experience: ${reg.professionalInfo?.yearsExperience || 0} years`);
          console.log(`      Status: ${reg.status}`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 5: Filter by attendance type
  try {
    console.log('\n5. Getting In-Person Attendees...');
    const response = await axios.get(`${BASE_URL}/conference/admin/registrations?attendanceType=in_person&confirmed=true&limit=5`, { headers });
    
    if (response.data.success) {
      const inPersonRegs = response.data.data.registrations;
      console.log(`✅ In-Person Attendees Retrieved!`);
      console.log(`   📋 In-Person Count: ${inPersonRegs.length}`);
      
      if (inPersonRegs.length > 0) {
        console.log(`\n🏢 IN-PERSON CONFIRMED ATTENDEES:`);
        inPersonRegs.forEach((reg, index) => {
          console.log(`   ${index + 1}. ${reg.fullName}`);
          console.log(`      Organization: ${reg.organization}`);
          console.log(`      Location: ${reg.affiliation?.address?.city || 'Not provided'}, ${reg.affiliation?.address?.state || ''}`);
          console.log(`      Status: ${reg.status}`);
          
          if (reg.preferences?.emergencyContact) {
            console.log(`      Emergency Contact: ${reg.preferences.emergencyContact.name || 'Not provided'}`);
          }
          
          if (reg.preferences?.dietaryRestrictions?.length > 0) {
            console.log(`      Dietary Restrictions: ${reg.preferences.dietaryRestrictions.join(', ')}`);
          }
          
          if (reg.preferences?.accessibilityNeeds) {
            console.log(`      Accessibility Needs: ${reg.preferences.accessibilityNeeds}`);
          }
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 6: Get pending registrations
  try {
    console.log('\n6. Getting Pending Registrations...');
    const response = await axios.get(`${BASE_URL}/conference/admin/registrations?status=pending&limit=5`, { headers });
    
    if (response.data.success) {
      const pendingRegs = response.data.data.registrations;
      console.log(`✅ Pending Registrations Retrieved!`);
      console.log(`   📋 Pending Count: ${pendingRegs.length}`);
      
      if (pendingRegs.length > 0) {
        console.log(`\n⏳ PENDING CONFIRMATIONS:`);
        pendingRegs.forEach((reg, index) => {
          const daysSinceRegistration = Math.floor((new Date() - new Date(reg.registeredDate)) / (1000 * 60 * 60 * 24));
          console.log(`   ${index + 1}. ${reg.fullName}`);
          console.log(`      Email: ${reg.email}`);
          console.log(`      Organization: ${reg.organization}`);
          console.log(`      Registered: ${daysSinceRegistration} days ago`);
          console.log(`      Confirmation Code: ${reg.confirmation.code}`);
          
          if (daysSinceRegistration > 3) {
            console.log(`      ⚠️  May need follow-up reminder`);
          }
        });
      } else {
        console.log(`   ✨ All registrations are confirmed!`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 7: Get registration analytics by year
  try {
    console.log('\n7. Getting Multi-Year Statistics...');
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear];
    
    for (const year of years) {
      try {
        const response = await axios.get(`${BASE_URL}/conference/admin/stats?year=${year}`, { headers });
        
        if (response.data.success) {
          const stats = response.data.data.statistics;
          console.log(`\n📊 YEAR ${year}:`);
          console.log(`   Total: ${stats.total || 0}`);
          console.log(`   Confirmed: ${stats.confirmed || 0}`);
          console.log(`   Research Submissions: ${stats.withResearchSubmissions || 0}`);
          console.log(`   First Time: ${stats.firstTimeAttendees || 0}`);
        }
      } catch (yearError) {
        console.log(`   📊 YEAR ${year}: No data available`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 8: Get first-time attendees
  try {
    console.log('\n8. Analyzing First-Time Attendees...');
    const response = await axios.get(`${BASE_URL}/conference/admin/registrations?limit=50`, { headers });
    
    if (response.data.success) {
      const allRegs = response.data.data.registrations;
      const firstTimeAttendees = allRegs.filter(reg => reg.additionalInfo?.firstTimeAttendee);
      const returningAttendees = allRegs.filter(reg => !reg.additionalInfo?.firstTimeAttendee);
      
      console.log(`✅ Attendee Analysis Complete!`);
      console.log(`   📋 Total Analyzed: ${allRegs.length}`);
      console.log(`   🆕 First-Time Attendees: ${firstTimeAttendees.length}`);
      console.log(`   🔄 Returning Attendees: ${returningAttendees.length}`);
      
      if (firstTimeAttendees.length > 0) {
        const firstTimeRate = ((firstTimeAttendees.length / allRegs.length) * 100).toFixed(1);
        console.log(`   📈 First-Time Rate: ${firstTimeRate}%`);
        
        console.log(`\n🆕 FIRST-TIME ATTENDEES (Sample):`);
        firstTimeAttendees.slice(0, 3).forEach((reg, index) => {
          console.log(`   ${index + 1}. ${reg.fullName} (${reg.organization})`);
          console.log(`      How they heard: ${reg.additionalInfo?.howDidYouHear || 'Not specified'}`);
          console.log(`      Discipline: ${reg.professional?.discipline || 'Not specified'}`);
        });
      }
      
      if (returningAttendees.length > 0) {
        console.log(`\n🔄 RETURNING ATTENDEES (Sample):`);
        returningAttendees.slice(0, 3).forEach((reg, index) => {
          const previousYears = reg.additionalInfo?.previousSOBIEYears || [];
          console.log(`   ${index + 1}. ${reg.fullName} (${reg.organization})`);
          console.log(`      Previous years: ${previousYears.length > 0 ? previousYears.join(', ') : 'Not specified'}`);
          console.log(`      Years attended: ${previousYears.length}`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ ADMIN CONFERENCE MANAGEMENT TEST COMPLETE!');
  console.log('\n🎯 Admin Features Demonstrated:');
  console.log('   📊 Registration Statistics & Analytics');
  console.log('   📋 View All Registrations with Pagination');
  console.log('   🔍 Filter by Status (pending, confirmed, cancelled)');
  console.log('   🎓 Filter by Discipline & Academic Level');
  console.log('   🏢 Filter by Attendance Type (in-person, virtual, hybrid)');
  console.log('   ⏳ Identify Pending Confirmations');
  console.log('   📈 Multi-Year Registration Analysis');
  console.log('   🆕 First-Time vs Returning Attendee Analysis');
  console.log('\n📊 Available Admin Filters:');
  console.log('   • Year (conference year)');
  console.log('   • Status (pending, confirmed, cancelled, waitlisted)');
  console.log('   • Discipline (accounting, analytics, IS, etc.)');
  console.log('   • Attendance Type (in_person, virtual, hybrid)');
  console.log('   • Confirmed (true/false)');
  console.log('   • Pagination (page, limit)');
  console.log('\n📈 Admin Analytics Available:');
  console.log('   • Total registrations by year');
  console.log('   • Confirmation rates');
  console.log('   • Research submission rates');
  console.log('   • First-time attendee percentages');
  console.log('   • Attendance type distribution');
  console.log('   • Discipline distribution');
  console.log('   • Geographic distribution');
  console.log('\n🔧 Admin Management Capabilities:');
  console.log('   • View detailed registration information');
  console.log('   • Track confirmation status');
  console.log('   • Identify attendees needing follow-up');
  console.log('   • Export data for external analysis');
  console.log('   • Monitor registration trends');
  console.log('   • Plan for catering and logistics');
}

async function runAdminConferenceTests() {
  console.log('👑 SOBIE ADMIN CONFERENCE MANAGEMENT TEST SUITE\n');
  console.log('This tests admin capabilities for conference registration management!\n');
  
  // Step 1: Admin login
  const loginSuccess = await adminLogin();
  
  if (loginSuccess) {
    // Step 2: Test admin conference management
    await testAdminConferenceManagement();
  } else {
    console.log('\n❌ Cannot test admin conference management without admin authentication');
    console.log('   Please ensure user has admin role permissions');
  }
  
  console.log('\n✅ Admin Testing Complete!');
}

// Run the admin tests
runAdminConferenceTests().catch(console.error);
