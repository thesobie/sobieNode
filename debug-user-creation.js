const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

require('dotenv').config();

async function debugUserCreation() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Get User model
    const User = require('./src/models/User');

    // Clean up any existing test user
    await User.deleteOne({ email: 'debug-test@test.com' });

    // Create a test user directly (let the schema handle password hashing)
    console.log('🔒 Creating user with plain password (schema will hash it)');

    const testUser = await User.create({
      email: 'debug-test@test.com',
      password: 'TestPassword123!', // Plain password - let schema hash it
      name: { firstName: 'Debug', lastName: 'Test' },
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

    console.log('✅ Test user created with ID:', testUser._id);
    console.log('📧 Email stored as:', testUser.email);
    console.log('🔐 Password stored (hashed):', !!testUser.password);
    console.log('👤 Active status:', testUser.isActive);

    // Try to find the user the same way the auth service does
    const foundUser = await User.findOne({ 
      email: 'debug-test@test.com'.toLowerCase(), 
      isActive: true 
    }).select('+password');

    console.log('\n🔍 User search results:');
    console.log('Found user:', !!foundUser);
    if (foundUser) {
      console.log('Email match:', foundUser.email);
      console.log('Has password:', !!foundUser.password);
      console.log('Is active:', foundUser.isActive);
      
      // Test password comparison
      const isPasswordValid = await foundUser.comparePassword('TestPassword123!');
      console.log('Password comparison result:', isPasswordValid);
    }

    // Clean up
    await User.deleteOne({ email: 'debug-test@test.com' });
    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

debugUserCreation();
