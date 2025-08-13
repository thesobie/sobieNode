const axios = require('axios');
const mongoose = require('mongoose');

require('dotenv').config();

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

console.log('🧪 API Debug Test\n');

async function debugApiAuth() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Get User model
    const User = require('./src/models/User');

    // Clean up any existing test user
    await User.deleteOne({ email: 'api-debug@test.com' });

    // Create a test user directly (let schema handle password hashing)
    const testUser = await User.create({
      email: 'api-debug@test.com',
      password: 'TestPassword123!', // Plain password - schema will hash it
      name: { firstName: 'API', lastName: 'Debug' },
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
    console.log('🔐 User ID:', testUser._id);
    console.log('👤 Is active:', testUser.isActive);

    // Verify user exists by searching
    const foundUser = await User.findOne({ 
      email: 'api-debug@test.com'.toLowerCase(), 
      isActive: true 
    }).select('+password');
    
    console.log('🔍 User found in database:', !!foundUser);
    if (foundUser) {
      console.log('📧 Found email:', foundUser.email);
      console.log('🔐 Has password:', !!foundUser.password);
      
      // Test password comparison
      const isPasswordValid = await foundUser.comparePassword('TestPassword123!');
      console.log('✅ Password comparison works:', isPasswordValid);
    }

    // Now try the API call with detailed debugging
    console.log('\n🌐 Testing API call...');
    
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'api-debug@test.com',
        password: 'TestPassword123!'
      });

      console.log('✅ API Login successful!');
      console.log('🎯 Response:', loginResponse.data);

    } catch (apiError) {
      console.log('❌ API call failed:');
      console.log('Status:', apiError.response?.status);
      console.log('Data:', apiError.response?.data);
      
      // Let's also check what the server logs show
      console.log('\n📝 Check server logs for more details...');
    }

    // Clean up
    await User.deleteOne({ email: 'api-debug@test.com' });
    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

debugApiAuth();
