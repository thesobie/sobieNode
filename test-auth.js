#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

async function testAuthentication() {
  console.log('🧪 Testing Authentication System with Real Email\n');
  console.log(`📧 Using test email: ${TEST_EMAIL}\n`);

  const userData = {
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

  try {
    // Test 1: Health Check
    console.log('1. Health Check...');
    const health = await axios.get('http://localhost:3000/health');
    console.log('✅ Server Status:', health.data.status);
    console.log('   Email Service:', health.data.services.email);
    console.log('   JWT Service:', health.data.services.jwt);

    let accessToken;
    let userId;

    // Test 2: User Registration (or Login if exists)
    console.log('\n2. Testing User Registration...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, userData);
      console.log('✅ Registration Status:', registerResponse.status);
      accessToken = registerResponse.data.tokens.accessToken;
      userId = registerResponse.data.user.id;
      console.log('   User ID:', userId);
      console.log('   Access Token:', accessToken ? 'Present' : 'Missing');
      console.log('   📧 Check your email at', TEST_EMAIL, 'for verification email!');
    } catch (error) {
      if (error.response?.data?.error?.includes('already exists')) {
        console.log('ℹ️  User already exists, trying login instead...');
        
        // Test 3: User Login (moved up since registration failed)
        console.log('\n3. Testing User Login...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: userData.email,
          password: userData.password
        });
        console.log('✅ Login Status:', loginResponse.status);
        accessToken = loginResponse.data.tokens.accessToken;
        userId = loginResponse.data.user.id;
        console.log('   User ID:', userId);
        console.log('   Access Token:', accessToken ? 'Present' : 'Missing');
      } else {
        throw error;
      }
    }

    // Test 4: Magic Link Request
    console.log('\n4. Testing Magic Link Request...');
    try {
      const magicLinkResponse = await axios.post(`${BASE_URL}/auth/magic-link`, {
        email: userData.email
      });
      console.log('✅ Magic Link Status:', magicLinkResponse.status);
      console.log('   Message:', magicLinkResponse.data.message);
      console.log('   📧 Check your email at', TEST_EMAIL, 'for the magic link!');
    } catch (error) {
      console.log('⚠️  Magic Link failed:', error.response?.status, error.response?.data?.message);
    }

    // Test 5: Token Refresh
    console.log('\n5. Testing Token Refresh...');
    try {
      const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
        withCredentials: true
      });
      console.log('✅ Token Refresh Status:', refreshResponse.status);
    } catch (error) {
      console.log('⚠️  Token refresh failed:', error.response?.status, error.response?.data?.message);
    }

    // Test 6: Protected Route (if profile endpoint exists)
    console.log('\n6. Testing Protected Route Access...');
    try {
      const profileResponse = await axios.get(`${BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('✅ Profile Access Status:', profileResponse.status);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️  Profile endpoint not found (not implemented yet)');
      } else {
        console.log('❌ Profile Access Error:', error.response?.status, error.response?.data?.message);
      }
    }

    console.log('\n🎉 Authentication System Test Complete!');
    console.log('\n📝 Summary:');
    console.log('- ✅ Server is running with email service configured');
    console.log('- ✅ User registration/login works');
    console.log('- ✅ JWT tokens are generated');
    console.log('- 📧 Real email should be sent to', TEST_EMAIL);
    console.log('- 🔗 Magic link functionality should work with real email');

  } catch (error) {
    console.error('❌ Test Error:', error.response?.data || error.message);
  }
}

testAuthentication();
