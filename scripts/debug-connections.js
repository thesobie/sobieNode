const mongoose = require('mongoose');

require('dotenv').config();

async function checkConnections() {
  try {
    console.log('📊 Database Connection Debug\n');
    
    // Connect to database like our tests do
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    console.log('🔗 Connection details:');
    console.log('Database name:', mongoose.connection.name);
    console.log('Database host:', mongoose.connection.host);
    console.log('Database port:', mongoose.connection.port);
    console.log('Connection state:', mongoose.connection.readyState);
    console.log('MongoDB URI (first 50 chars):', process.env.MONGODB_URI.substring(0, 50) + '...');
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Available collections:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Check users collection specifically
    const User = require('./src/models/User');
    const userCount = await User.countDocuments();
    console.log(`\n👥 Total users in collection: ${userCount}`);
    
    // List recent users
    const recentUsers = await User.find({}, 'email createdAt').sort({ createdAt: -1 }).limit(5);
    console.log('\n📧 Recent users:');
    recentUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (created: ${user.createdAt})`);
    });
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Connection debug failed:', error.message);
    process.exit(1);
  }
}

checkConnections();
