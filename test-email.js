#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

async function testEmailWithTimestamp() {
  console.log('🧪 Testing Email Functionality with Fresh User\n');

  // Use a timestamp to create a unique email
  const timestamp = Date.now();
  const userData = {
    email: `barry.test.${timestamp}@gmail.com`,
    password: 'SecurePass123!',
    name: {
      firstName: 'Barry',
      lastName: 'Test'
    },
    userType: 'academic',
    affiliation: {
      organization: 'SOBIE Conference'
    }
  };

  try {
    console.log('🔍 Testing with email:', userData.email);
    
    // Test 1: Health Check
    console.log('\n1. Health Check...');
    const health = await axios.get('http://localhost:3000/health');
    console.log('✅ Server Status:', health.data.status);

    // Test 2: Register user (should work with unique email)
    console.log('\n2. Registering new user...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, userData);
      console.log('✅ Registration Status:', registerResponse.status);
      console.log('   📧 Check', TEST_EMAIL, 'for verification email!');
      
      // Test 3: Request Magic Link immediately
      console.log('\n3. Requesting Magic Link...');
      const magicLinkResponse = await axios.post(`${BASE_URL}/auth/magic-link`, {
        email: userData.email
      });
      console.log('✅ Magic Link Status:', magicLinkResponse.status);
      console.log('   Message:', magicLinkResponse.data.message);
      console.log('   📧 Check', TEST_EMAIL, 'for the magic link!');
      
    } catch (error) {
      console.log('❌ Registration/Magic Link Error:', error.response?.status, error.response?.data?.message);
    }

    console.log('\n📧 Summary:');
    console.log('- User registration attempted with:', userData.email);
    console.log('- If successful, two emails should be sent to', TEST_EMAIL + ':');
    console.log('  1. Account verification email');
    console.log('  2. Magic link email');
    console.log('- Check your email and look for new messages!');

  } catch (error) {
    console.error('❌ Test Error:', error.response?.data || error.message);
  }
}

testEmailWithTimestamp();
