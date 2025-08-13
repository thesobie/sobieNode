#!/usr/bin/env node

/**
 * Script to set Barry's password to CatCat1!
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

const TEST_EMAIL = 'barrycumbie@gmail.com';
const NEW_PASSWORD = 'CatCat1!';

async function setBarryPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');

    // Find Barry's user account
    const user = await User.findOne({ email: TEST_EMAIL });
    
    if (!user) {
      console.log('❌ User not found. Creating new user account...');
      
      const newUser = new User({
        email: TEST_EMAIL,
        password: NEW_PASSWORD, // Will be hashed automatically by pre-save middleware
        name: {
          firstName: 'Barry',
          lastName: 'Cumbie'
        },
        userType: 'admin',
        roles: ['admin', 'user'],
        affiliation: {
          organization: 'SOBIE Development Team'
        },
        isEmailVerified: true,
        isActive: true
      });
      
      await newUser.save();
      console.log('✅ New user account created with password: CatCat1!');
    } else {
      console.log('👤 Found existing user account');
      
      // Hash the new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, saltRounds);
      
      // Update the password
      user.password = hashedPassword;
      user.isEmailVerified = true;
      user.isActive = true;
      
      // Reset login attempts if any
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      
      await user.save();
      console.log('✅ Password updated successfully to: CatCat1!');
    }

    console.log('\n🔐 Test Credentials:');
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    console.log('\n🚀 You can now test the user participation endpoints!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
}

setBarryPassword();
