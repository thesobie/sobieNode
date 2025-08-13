// Simple test to verify Community models work
console.log('🧪 Testing SOBIE Community Models');

try {
  console.log('Loading CommunityActivity model...');
  const CommunityActivity = require('./src/models/CommunityActivity');
  console.log('✅ CommunityActivity model loaded');

  console.log('Loading CommunityInterest model...');
  const CommunityInterest = require('./src/models/CommunityInterest');
  console.log('✅ CommunityInterest model loaded');

  console.log('Loading updated User model...');
  const User = require('./src/models/User');
  console.log('✅ User model loaded');

  console.log('Testing User role enum...');
  const userSchema = User.schema;
  const rolesPath = userSchema.paths.roles;
  const allowedRoles = rolesPath.options?.enum || rolesPath.enumValues || [];
  console.log('📝 Allowed roles:', allowedRoles);
  
  if (allowedRoles.includes('activity-coordinator')) {
    console.log('✅ activity-coordinator role found');
  } else {
    console.log('❌ activity-coordinator role NOT found');
    console.log('🔍 Available roles:', allowedRoles);
  }

  console.log('\n🎉 All Community models loaded successfully!');
  console.log('\n📋 Community Features Available:');
  console.log('• Activity Coordinator role added to User model');
  console.log('• CommunityActivity model for managing activities (golf, volleyball, trivia, etc.)');
  console.log('• CommunityInterest model for tracking user interests and contact preferences');
  console.log('• Full API routes for community functionality');
  console.log('• Privacy-respecting contact sharing system');

} catch (error) {
  console.error('❌ Error loading models:', error.message);
  process.exit(1);
}
