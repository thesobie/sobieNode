const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

console.log('🧪 Simple Auth Test\n');

async function testAuth() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Get User model
    const User = require('./src/models/User');

    // Clean up any existing test user
    await User.deleteOne({ email: 'simple-test@test.com' });

    // Create a test user directly (let schema handle password hashing)
    const testUser = await User.create({
      email: 'simple-test@test.com',
      password: 'TestPassword123!', // Plain password - schema will hash it
      name: { firstName: 'Simple', lastName: 'Test' },
      isEmailVerified: true,
      userType: 'academic',
      affiliation: {
        organization: 'Test University',
        department: 'Testing'
      },
      profile: { 
        academicInfo: { institution: 'Test University' } 
      }
    });

    console.log('✅ Test user created:', testUser.email);

    // Try to login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'simple-test@test.com',
      password: 'TestPassword123!'
    });

    console.log('✅ Login successful!');
    console.log('🎯 Token received:', loginResponse.data.success ? 'Yes' : 'No');

    // Test authenticated request
    const profileResponse = await axios.get(`${API_BASE_URL}/profiles/me`, {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.data.token}`
      }
    });

    console.log('✅ Authenticated request successful!');
    console.log('👤 User profile:', profileResponse.data.data.name);

    // Clean up
    await User.deleteOne({ email: 'simple-test@test.com' });
    await mongoose.connection.close();

    console.log('\n🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testAuth();
