#!/usr/bin/env node

/**
 * Comprehensive Test Script for SOBIE Conference Registration System
 * Tests the complete conference registration workflow
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'barrycumbie@gmail.com';
const TEST_PASSWORD = 'CatCat1!';

let authToken = null;

async function login() {
  try {
    console.log('🔐 Logging in as Barry Cumbie...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Login successful!');
      return true;
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testConferenceRegistrationSystem() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  console.log('\n🎯 TESTING CONFERENCE REGISTRATION SYSTEM\n');
  console.log('=' .repeat(80));

  // Test 1: Get current conference information
  try {
    console.log('\n1. Getting Current Conference Information...');
    const response = await axios.get(`${BASE_URL}/conference/current`);
    
    if (response.data.success) {
      const conference = response.data.data.conference;
      console.log('✅ Conference Information Retrieved!');
      console.log(`   📅 Conference: ${conference.name}`);
      console.log(`   📍 Location: ${conference.location.venue}, ${conference.location.city}, ${conference.location.state}`);
      console.log(`   📆 Dates: ${new Date(conference.startDate).toLocaleDateString()} - ${new Date(conference.endDate).toLocaleDateString()}`);
      console.log(`   ⏰ Registration Deadline: ${new Date(conference.registrationDeadline).toLocaleDateString()}`);
      console.log(`   🎫 Registration Fee: ${conference.registrationFee.required ? '$' + conference.registrationFee.amount : 'FREE'}`);
      console.log(`   🔓 Registration Open: ${response.data.data.registrationOpen ? 'Yes' : 'No'}`);
      console.log(`   📊 Days Until Deadline: ${response.data.data.daysUntilDeadline}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: Check current registration status
  try {
    console.log('\n2. Checking Current Registration Status...');
    const response = await axios.get(`${BASE_URL}/conference/my-registration`, { headers });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log(`✅ Registration Status Retrieved!`);
      console.log(`   📋 Registered: ${data.isRegistered ? 'Yes' : 'No'}`);
      
      if (data.isRegistered) {
        const reg = data.registration;
        console.log(`   📊 Status: ${reg.status}`);
        console.log(`   ✅ Confirmed: ${reg.confirmed ? 'Yes' : 'No'}`);
        console.log(`   👤 Full Name: ${reg.fullName}`);
        console.log(`   🏢 Organization: ${reg.organization}`);
        console.log(`   🎯 Attendance Type: ${reg.attendanceType}`);
        console.log(`   📅 Registered Date: ${new Date(reg.registeredDate).toLocaleDateString()}`);
        console.log(`   ⏰ Days Until Conference: ${reg.daysUntilConference}`);
        console.log(`   🔬 Can Submit Research: ${data.canSubmitResearch ? 'Yes' : 'No'}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 3: Get registration form with pre-filled data
  try {
    console.log('\n3. Getting Registration Form...');
    const response = await axios.get(`${BASE_URL}/conference/registration-form`, { headers });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('✅ Registration Form Retrieved!');
      console.log(`   📧 Email Verified: ${data.userEmailVerified ? 'Yes' : 'No'}`);
      console.log(`   📋 Pre-filled Data Available: ${Object.keys(data.prefilledData).length} sections`);
      
      const prefilled = data.prefilledData;
      console.log(`\n   👤 Personal Info:`);
      console.log(`      Name: ${prefilled.personalInfo.firstName} ${prefilled.personalInfo.lastName}`);
      console.log(`      Email: ${prefilled.personalInfo.email}`);
      console.log(`      Phone: ${prefilled.personalInfo.phone || 'Not provided'}`);
      
      console.log(`\n   🏢 Affiliation:`);
      console.log(`      Organization: ${prefilled.affiliation.organization || 'Not provided'}`);
      console.log(`      Department: ${prefilled.affiliation.department || 'Not provided'}`);
      console.log(`      Position: ${prefilled.affiliation.position || 'Not provided'}`);
      
      console.log(`\n   🎓 Professional:`);
      console.log(`      Discipline: ${prefilled.professional.discipline || 'Not provided'}`);
      console.log(`      Academic Level: ${prefilled.professional.academicLevel || 'Not provided'}`);
      console.log(`      Years Experience: ${prefilled.professional.yearsExperience || 0}`);
      
      console.log(`\n   🔧 Form Options Available:`);
      console.log(`      Disciplines: ${data.formOptions.disciplines.length}`);
      console.log(`      Academic Levels: ${data.formOptions.academicLevels.length}`);
      console.log(`      Attendance Types: ${data.formOptions.attendanceTypes.length}`);
      console.log(`      Session Interests: ${data.formOptions.sessionInterests.length}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 4: Submit conference registration (if not already registered)
  let registrationData = null;
  try {
    console.log('\n4. Submitting Conference Registration...');
    
    const registrationPayload = {
      registrationInfo: {
        personalInfo: {
          firstName: 'Barry',
          lastName: 'Cumbie',
          email: 'barrycumbie@gmail.com',
          phone: '256-555-0123'
        },
        affiliation: {
          organization: 'SOBIE Development Team',
          department: 'Technology',
          position: 'Lead Developer',
          address: {
            street: '123 Tech Drive',
            city: 'Birmingham',
            state: 'Alabama',
            zipCode: '35203',
            country: 'United States'
          }
        },
        professional: {
          discipline: 'information_systems',
          academicLevel: 'professional',
          yearsExperience: 15,
          researchInterests: ['Database Systems', 'Web Development', 'Conference Management']
        }
      },
      preferences: {
        attendanceType: 'in_person',
        sessionInterests: ['keynote', 'research_presentations', 'workshops', 'networking'],
        dietaryRestrictions: [],
        accessibilityNeeds: '',
        emergencyContact: {
          name: 'Jane Cumbie',
          relationship: 'Spouse',
          phone: '256-555-0124',
          email: 'jane.cumbie@example.com'
        }
      },
      additionalInfo: {
        firstTimeAttendee: false,
        previousSOBIEYears: [2020, 2021, 2022, 2023, 2024],
        howDidYouHear: 'previous_attendee',
        specialRequests: 'Looking forward to presenting new database features',
        marketingOptIn: true
      }
    };

    const response = await axios.post(`${BASE_URL}/conference/register`, registrationPayload, { headers });
    
    if (response.data.success) {
      registrationData = response.data.data;
      console.log('✅ Conference Registration Submitted!');
      console.log(`   📋 Registration ID: ${registrationData.registration.id}`);
      console.log(`   📊 Status: ${registrationData.registration.status}`);
      console.log(`   🔢 Confirmation Code: ${registrationData.confirmationCode}`);
      console.log(`   📧 Email Sent: ${registrationData.emailSent ? 'Yes' : 'No'}`);
      console.log(`   👤 Full Name: ${registrationData.registration.fullName}`);
      console.log(`   🏢 Organization: ${registrationData.registration.organization}`);
      console.log(`   🎯 Attendance Type: ${registrationData.registration.attendanceType}`);
      
      console.log(`\n   📝 Next Steps:`);
      registrationData.nextSteps.forEach((step, index) => {
        console.log(`      ${index + 1}. ${step}`);
      });
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already registered')) {
      console.log('ℹ️  Already registered for this conference');
      console.log(`   Registration: ${error.response.data.data?.registration?.fullName || 'Found'}`);
    } else {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 5: Update registration (if pending)
  if (registrationData && registrationData.registration.status === 'pending') {
    try {
      console.log('\n5. Updating Registration...');
      const updatePayload = {
        preferences: {
          attendanceType: 'hybrid',
          sessionInterests: ['keynote', 'research_presentations', 'workshops', 'networking', 'poster_sessions'],
          specialRequests: 'Updated: Looking forward to presenting new features and attending networking events'
        },
        additionalInfo: {
          specialRequests: 'Updated: Excited to demonstrate the new SOBIE registration system'
        }
      };

      const response = await axios.put(`${BASE_URL}/conference/registration`, updatePayload, { headers });
      
      if (response.data.success) {
        console.log('✅ Registration Updated Successfully!');
        console.log(`   📋 Registration ID: ${response.data.data.registration.id}`);
        console.log(`   🎯 New Attendance Type: ${response.data.data.registration.attendanceType}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 6: Confirm registration
  if (registrationData && registrationData.confirmationCode) {
    try {
      console.log('\n6. Confirming Registration...');
      const confirmPayload = {
        confirmationCode: registrationData.confirmationCode
      };

      const response = await axios.post(`${BASE_URL}/conference/confirm`, confirmPayload);
      
      if (response.data.success) {
        console.log('✅ Registration Confirmed Successfully!');
        console.log(`   📋 Registration: ${response.data.data.registration.fullName}`);
        console.log(`   📊 Status: ${response.data.data.registration.status}`);
        console.log(`   ✅ Confirmed: ${response.data.data.registration.confirmed ? 'Yes' : 'No'}`);
        console.log(`   🔬 Can Submit Research: ${response.data.data.canSubmitResearch ? 'Yes' : 'No'}`);
        
        console.log(`\n   📝 Next Steps:`);
        response.data.data.nextSteps.forEach((step, index) => {
          console.log(`      ${index + 1}. ${step}`);
        });
      }
    } catch (error) {
      if (error.response?.data?.data?.alreadyConfirmed) {
        console.log('ℹ️  Registration is already confirmed');
      } else {
        console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  // Test 7: Test resend confirmation (if needed)
  try {
    console.log('\n7. Testing Resend Confirmation...');
    const response = await axios.post(`${BASE_URL}/conference/resend-confirmation`, {}, { headers });
    
    if (response.data.success) {
      if (response.data.data.alreadyConfirmed) {
        console.log('ℹ️  Registration is already confirmed - no need to resend');
      } else {
        console.log('✅ Confirmation Email Resent!');
        console.log(`   🔢 New Confirmation Code: ${response.data.data.confirmationCode}`);
        console.log(`   📧 Email Sent: ${response.data.data.emailSent ? 'Yes' : 'No'}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 8: Get final registration status
  try {
    console.log('\n8. Getting Final Registration Status...');
    const response = await axios.get(`${BASE_URL}/conference/my-registration`, { headers });
    
    if (response.data.success) {
      const data = response.data.data;
      console.log('✅ Final Registration Status:');
      
      if (data.isRegistered) {
        const reg = data.registration;
        console.log(`   📋 Registered: Yes`);
        console.log(`   📊 Status: ${reg.status}`);
        console.log(`   ✅ Confirmed: ${reg.confirmed ? 'Yes' : 'No'}`);
        console.log(`   👤 Full Name: ${reg.fullName}`);
        console.log(`   📧 Email: ${reg.email}`);
        console.log(`   🏢 Organization: ${reg.organization}`);
        console.log(`   🎯 Attendance Type: ${reg.attendanceType}`);
        console.log(`   📅 Registered: ${new Date(reg.registeredDate).toLocaleDateString()}`);
        console.log(`   ⏰ Days Until Conference: ${reg.daysUntilConference}`);
        console.log(`   🔬 Can Submit Research: ${data.canSubmitResearch ? 'Yes' : 'No'}`);
      } else {
        console.log(`   📋 Registered: No`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ CONFERENCE REGISTRATION SYSTEM TEST COMPLETE!');
  console.log('\n🎯 Features Demonstrated:');
  console.log('   📋 Get Current Conference Information');
  console.log('   📊 Check Registration Status');
  console.log('   📝 Get Pre-filled Registration Form');
  console.log('   ✅ Submit Conference Registration');
  console.log('   ✏️  Update Registration Details');
  console.log('   🔐 Confirm Registration with Code');
  console.log('   📧 Resend Confirmation Email');
  console.log('   👀 View Final Registration Status');
  console.log('\n📬 Email Workflow:');
  console.log('   1. Registration confirmation email with code and link');
  console.log('   2. Registration confirmed email with next steps');
  console.log('   3. Registration cancelled email (if cancelled)');
  console.log('\n🔐 Security Features:');
  console.log('   • Email verification required before registration');
  console.log('   • Unique confirmation codes and tokens');
  console.log('   • Token expiration (7 days)');
  console.log('   • User can only update before confirmation');
  console.log('   • Input validation and sanitization');
  console.log('\n📊 Registration Data Captured:');
  console.log('   • Personal Information (name, email, phone)');
  console.log('   • Affiliation Details (organization, department, position)');
  console.log('   • Professional Information (discipline, academic level)');
  console.log('   • Conference Preferences (attendance type, sessions)');
  console.log('   • Emergency Contact Information');
  console.log('   • Dietary Restrictions & Accessibility Needs');
  console.log('   • Previous SOBIE Experience');
}

async function runConferenceTests() {
  console.log('🎉 SOBIE CONFERENCE REGISTRATION SYSTEM TEST SUITE\n');
  console.log('This tests the complete conference registration workflow!\n');
  
  // Step 1: Login
  const loginSuccess = await login();
  
  if (loginSuccess) {
    // Step 2: Test conference registration system
    await testConferenceRegistrationSystem();
  } else {
    console.log('\n❌ Cannot test conference registration without authentication');
    console.log('   Please ensure user account exists and email is verified');
  }
  
  console.log('\n✅ Testing Complete!');
}

// Run the tests
runConferenceTests().catch(console.error);
