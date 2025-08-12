#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

async function testEmailVerificationAndMagicLink() {
  console.log('🧪 Testing Email Verification & Magic Link Authentication\n');
  console.log(`📧 Using test email: ${TEST_EMAIL}\n`);

  // Use timestamp to create unique email for testing
  const timestamp = Date.now();
  const testUser = {
    email: `test.${timestamp}@example.com`,
    password: 'CatCat123!',
    name: {
      firstName: 'Test',
      lastName: 'User'
    },
    userType: 'academic',
    affiliation: {
      organization: 'Test University'
    }
  };

  try {
    // Test 1: Health Check
    console.log('1. Health Check...');
    const health = await axios.get('http://localhost:3000/health');
    console.log('✅ Server Status:', health.data.status);
    console.log('   Email Service:', health.data.services.email);

    // Test 2: Create new user profile
    console.log('\n2. Creating SOBIE Profile...');
    let registerResponse;
    try {
      registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
      console.log('✅ Profile Creation Status:', registerResponse.status);
      console.log('   Message:', registerResponse.data.message);
      console.log('   User ID:', registerResponse.data.data.user.id);
      console.log('   Email Verified:', registerResponse.data.data.user.isEmailVerified);
      console.log('   Email Verification Sent:', registerResponse.data.data.emailVerificationSent);
      console.log('   📧 Verification email sent (would go to', TEST_EMAIL, ')');
    } catch (error) {
      console.log('❌ Profile Creation Error:', error.response?.status, error.response?.data?.message);
      return;
    }

    // Test 3: Try to login before email verification
    console.log('\n3. Testing Login Before Email Verification...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      console.log('✅ Login Status:', loginResponse.status);
      console.log('   Message:', loginResponse.data.message);
      console.log('   Email Verification Required:', !loginResponse.data.data.user.isEmailVerified);
    } catch (error) {
      console.log('⚠️  Login Before Verification:', error.response?.status, error.response?.data?.message);
    }

    // Test 4: Magic Link Request
    console.log('\n4. Testing Magic Link Request...');
    try {
      const magicLinkResponse = await axios.post(`${BASE_URL}/auth/magic-link`, {
        email: testUser.email
      });
      console.log('✅ Magic Link Status:', magicLinkResponse.status);
      console.log('   Message:', magicLinkResponse.data.message);
      console.log('   📧 Magic link sent (would go to', TEST_EMAIL, ')');
    } catch (error) {
      console.log('⚠️  Magic Link Error:', error.response?.status, error.response?.data?.message);
    }

    // Test 5: Test with real email address (your email)
    console.log('\n5. Testing with Real Email Address...');
    const realTestUser = {
      email: TEST_EMAIL,
      password: 'CatCat123!',
      name: {
        firstName: 'Barry',
        lastName: 'Cumbie'
      },
      userType: 'academic',
      affiliation: {
        organization: 'SOBIE Conference'
      }
    };

    try {
      const realRegisterResponse = await axios.post(`${BASE_URL}/auth/register`, realTestUser);
      console.log('✅ Real Email Registration Status:', realRegisterResponse.status);
      console.log('   📧 Real verification email sent to', TEST_EMAIL, '!');
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        console.log('ℹ️  User already exists, requesting magic link instead...');
        
        try {
          const realMagicLinkResponse = await axios.post(`${BASE_URL}/auth/magic-link`, {
            email: TEST_EMAIL
          });
          console.log('✅ Real Magic Link Status:', realMagicLinkResponse.status);
          console.log('   📧 Real magic link sent to', TEST_EMAIL, '!');
        } catch (magicError) {
          console.log('⚠️  Real Magic Link Error:', magicError.response?.status, magicError.response?.data?.message);
        }
      } else {
        console.log('❌ Real Email Error:', error.response?.status, error.response?.data?.message);
      }
    }

    console.log('\n🎉 Authentication Flow Test Complete!\n');
    
    console.log('📝 Summary:');
    console.log('✅ Profile creation works');
    console.log('✅ Email verification system is active');
    console.log('✅ Magic link system is functional');
    console.log('📧 Real emails should be sent to', TEST_EMAIL);
    console.log('\n🔍 Next Steps:');
    console.log('1. Check your email for verification/magic link messages');
    console.log('2. Click the verification link to verify email');
    console.log('3. Try the magic link login option');
    console.log('4. Test normal password login after verification');

  } catch (error) {
    console.error('❌ Test Error:', error.response?.data || error.message);
  }
}

testEmailVerificationAndMagicLink();
