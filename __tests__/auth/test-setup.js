const mongoose = require('mongoose');

// Setup for tests - ensure database connection before running tests
beforeAll(async () => {
  console.log('Setting up tests...');
  
  // Close existing connections if any
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  // Connect to database
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sobie-test');
  
  console.log('Database connected for tests');
}, 30000); // 30 second timeout for setup

// Cleanup after tests
afterAll(async () => {
  console.log('Cleaning up tests...');
  await mongoose.disconnect();
}, 30000);
