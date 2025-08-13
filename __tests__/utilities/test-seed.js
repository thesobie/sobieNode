require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../../src/models/User');

const testUser = {
  email: 'test@test.com',
  password: 'test123',
  name: {
    firstName: 'Test',
    lastName: 'User'
  },
  userType: 'academic',
  affiliation: {
    organization: 'Test University'
  },
  sobieHistory: {
    publications: [
      {
        year: 2023,
        title: 'Test Paper',
        type: 'paper',
        coAuthors: ['Dr. Test'],
        abstract: 'This is a test abstract.'
      }
    ]
  }
};

async function testSeed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const user = new User(testUser);
    await user.save();
    console.log('Test user created successfully');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

testSeed();
