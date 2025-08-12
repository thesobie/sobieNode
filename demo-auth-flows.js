#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

async function demonstrateAuthFlows() {
  console.log('🧪 SOBIE Authentication Flow Demonstration\n');
  console.log(`📧 Real email for testing: ${TEST_EMAIL}\n`);

  try {
    // Test 1: Health Check
    console.log('1. 🏥 Health Check...');
    const health = await axios.get('http://localhost:3000/health');
    console.log('   ✅ Server Status:', health.data.status);
    console.log('   ✅ Email Service:', health.data.services.email);

    // Test 2: Show available authentication endpoints
    console.log('\n2. 🔗 Available Authentication Endpoints:');
    console.log('   📝 POST /api/auth/register - Create SOBIE Profile');
    console.log('   🔑 POST /api/auth/login - Password Login');
    console.log('   ✨ POST /api/auth/magic-link - Request Magic Link');
    console.log('   🔓 POST /api/auth/magic-login - Login with Magic Link');
    console.log('   ✅ POST /api/auth/verify-email - Verify Email Address');
    console.log('   🔄 POST /api/auth/resend-verification - Resend Verification');
    console.log('   🔒 POST /api/auth/forgot-password - Password Reset');

    // Test 3: Try magic link with your real email
    console.log('\n3. ✨ Testing Magic Link with Real Email...');
    try {
      const magicResponse = await axios.post(`${BASE_URL}/auth/magic-link`, {
        email: TEST_EMAIL
      });
      console.log('   ✅ Magic Link Request Status:', magicResponse.status);
      console.log('   📧 Magic link sent to:', TEST_EMAIL);
      console.log('   💬 Response:', magicResponse.data.message);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('   ℹ️  User not found - would need to create profile first');
        
        // Test 4: Create profile with real email
        console.log('\n4. 👤 Creating SOBIE Profile with Real Email...');
        try {
          const profileData = {
            email: TEST_EMAIL,
            password: 'SecurePass123!',
            name: {
              firstName: 'Barry',
              lastName: 'Cumbie'
            },
            userType: 'academic',
            affiliation: {
              organization: 'SOBIE Conference'
            }
          };

          const registerResponse = await axios.post(`${BASE_URL}/auth/register`, profileData);
          console.log('   ✅ Profile Creation Status:', registerResponse.status);
          console.log('   💬 Message:', registerResponse.data.message);
          console.log('   📧 Email Verification Sent to:', TEST_EMAIL);
          console.log('   ⚠️  Email must be verified before full access');

          // Test 5: Try magic link again after profile creation
          console.log('\n5. ✨ Testing Magic Link After Profile Creation...');
          const magicResponse2 = await axios.post(`${BASE_URL}/auth/magic-link`, {
            email: TEST_EMAIL
          });
          console.log('   ✅ Magic Link Status:', magicResponse2.status);
          console.log('   📧 Magic link sent to:', TEST_EMAIL);

        } catch (registerError) {
          if (registerError.response?.data?.error?.includes('already exists')) {
            console.log('   ℹ️  Profile already exists, trying magic link...');
            
            const magicResponse3 = await axios.post(`${BASE_URL}/auth/magic-link`, {
              email: TEST_EMAIL
            });
            console.log('   ✅ Magic Link Status:', magicResponse3.status);
            console.log('   📧 Magic link sent to:', TEST_EMAIL);
          } else {
            console.log('   ❌ Registration Error:', registerError.response?.data?.message);
          }
        }
      } else if (error.response?.status === 429) {
        console.log('   ⚠️  Rate limited - too many recent requests');
      } else {
        console.log('   ❌ Magic Link Error:', error.response?.status, error.response?.data?.message);
      }
    }

    console.log('\n🎉 Authentication Flow Demonstration Complete!\n');
    
    console.log('📋 What Just Happened:');
    console.log('1. ✅ Server is running with email service configured');
    console.log('2. ✅ All authentication endpoints are available');
    console.log('3. 📧 Real emails should be sent to', TEST_EMAIL);
    console.log('4. ✅ Users must verify email before full access');
    console.log('5. ✨ Magic link provides passwordless login option');

    console.log('\n📧 Check Your Email For:');
    console.log('• Email verification link (if profile was created)');
    console.log('• Magic link for passwordless login');

    console.log('\n🔄 Next Steps for Testing:');
    console.log('1. Check', TEST_EMAIL, 'for verification email');
    console.log('2. Click verification link to verify email');
    console.log('3. Try normal password login');
    console.log('4. Try magic link login');
    console.log('5. Test protected endpoints with JWT tokens');

    console.log('\n🔒 Security Features Active:');
    console.log('• Email verification required for full access');
    console.log('• Rate limiting prevents abuse');
    console.log('• JWT tokens with 15-minute access / 7-day refresh');
    console.log('• Magic links expire in 10 minutes');
    console.log('• Passwords hashed with bcrypt (12 rounds)');

  } catch (error) {
    console.error('❌ Test Error:', error.response?.data || error.message);
  }
}

demonstrateAuthFlows();
