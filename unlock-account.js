#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function unlockAccount() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'barrycumbie@gmail.com';
    
    // First, let's see what users exist
    const allUsers = await User.find({}, 'email name isActive loginAttempts lockUntil').limit(10);
    console.log('Available users in database:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.name?.firstName} ${user.name?.lastName}) - Active: ${user.isActive}, LoginAttempts: ${user.loginAttempts}, Locked: ${user.isLocked}`);
    });
    
    let user = await User.findOne({ email });
    
    if (!user) {
      console.log(`\nUser with email '${email}' not found`);
      
      // Create the user account
      console.log('Creating user account...');
      user = new User({
        email: email,
        password: 'CatCat123!',
        name: {
          firstName: 'Barry',
          lastName: 'Cumbie'
        },
        userType: 'academic',
        affiliation: {
          organization: 'SOBIE Conference'
        },
        isEmailVerified: true, // Skip email verification for testing
        loginAttempts: 0,
        lockUntil: undefined
      });
      
      try {
        await user.save();
        console.log('✅ User account created successfully!');
      } catch (error) {
        console.error('Error creating user:', error.message);
        if (error.code === 11000) {
          console.log('User already exists, trying to find it...');
          user = await User.findOne({ email });
        } else {
          throw error;
        }
      }
    }

    if (user) {
      console.log('\nCurrent user status:');
      console.log('- Email:', user.email);
      console.log('- Login attempts:', user.loginAttempts);
      console.log('- Is locked:', user.isLocked);
      console.log('- Lock until:', user.lockUntil);
      console.log('- Email verified:', user.isEmailVerified);

      // Reset login attempts and unlock
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      user.isEmailVerified = true; // Ensure email is verified
      
      // Add admin role if not already present
      if (!user.roles.includes('admin')) {
        user.roles.push('admin');
        console.log('- Added admin role');
      }
      
      await user.save();

      console.log('\n✅ Account unlocked and verified successfully!');
      console.log('- Login attempts reset to 0');
      console.log('- Account lock removed');
      console.log('- Email verification set to true');
      console.log('\nYou can now try logging in again with:');
      console.log('Email: barrycumbie@gmail.com');
      console.log('Password: CatCat123!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

unlockAccount();
