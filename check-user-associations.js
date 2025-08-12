const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const ResearchPresentation = require('./src/models/ResearchPresentation');
const User = require('./src/models/User');
const Session = require('./src/models/Session');

const checkUserAssociations = async () => {
  try {
    console.log('🔍 Checking User-Research Associations for SOBIE 2025');
    console.log('=' .repeat(60));
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all SOBIE 2025 presentations
    const allPresentations = await ResearchPresentation.find({ conferenceYear: 2025 });
    console.log(`📊 Total SOBIE 2025 Presentations: ${allPresentations.length}`);

    // Check presentations with linked users
    const presentationsWithUsers = await ResearchPresentation.find({
      conferenceYear: 2025,
      'authors.userId': { $exists: true, $ne: null }
    });
    console.log(`🔗 Presentations with Linked Users: ${presentationsWithUsers.length}`);

    // Check presentations without linked users
    const presentationsWithoutUsers = await ResearchPresentation.find({
      conferenceYear: 2025,
      $or: [
        { 'authors.userId': { $exists: false } },
        { 'authors.userId': null },
        { 'authors': { $size: 0 } }
      ]
    });
    console.log(`❌ Presentations WITHOUT Linked Users: ${presentationsWithoutUsers.length}`);

    console.log('\n📋 DETAILED ANALYSIS');
    console.log('-'.repeat(40));

    // Show sample presentations with authors but no user links
    console.log('\n🔍 Sample Presentations with Authors but No User Links:');
    const sampleUnlinked = await ResearchPresentation.find({
      conferenceYear: 2025,
      'authors.0': { $exists: true },
      'authors.userId': { $exists: false }
    }).limit(10);

    sampleUnlinked.forEach((pres, index) => {
      console.log(`\n${index + 1}. "${pres.title.substring(0, 60)}..."`);
      console.log(`   Authors in presentation: ${pres.authors.length}`);
      pres.authors.forEach((author, i) => {
        console.log(`   ${i + 1}. ${author.name?.firstName || 'Unknown'} ${author.name?.lastName || 'Unknown'} (${author.affiliation?.institution || 'Unknown'})`);
        console.log(`      UserID: ${author.userId || 'NOT LINKED'}`);
      });
    });

    // Check total users in system
    const totalUsers = await User.countDocuments();
    console.log(`\n👥 Total Users in System: ${totalUsers}`);

    // Check users by institution for SOBIE 2025 related institutions
    const institutionBreakdown = await User.aggregate([
      { $group: { _id: '$affiliation.organization', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    console.log('\n🏫 User Distribution by Institution:');
    institutionBreakdown.forEach(inst => {
      console.log(`   ${inst._id}: ${inst.count} users`);
    });

    // Find presentations that need user linking
    console.log('\n🔧 LINKING ANALYSIS');
    console.log('-'.repeat(40));

    // Check for presentations with author names but no user links
    const needsLinking = await ResearchPresentation.find({
      conferenceYear: 2025,
      'authors.name.firstName': { $exists: true },
      'authors.userId': { $exists: false }
    });

    console.log(`📈 Presentations needing user linking: ${needsLinking.length}`);

    // Sample linking opportunities
    console.log('\n🎯 Sample Linking Opportunities:');
    for (let i = 0; i < Math.min(5, needsLinking.length); i++) {
      const pres = needsLinking[i];
      console.log(`\n${i + 1}. "${pres.title.substring(0, 50)}..."`);
      
      for (const author of pres.authors) {
        if (author.name?.firstName && author.name?.lastName) {
          // Try to find matching user
          const potentialUser = await User.findOne({
            'name.firstName': new RegExp(author.name.firstName, 'i'),
            'name.lastName': new RegExp(author.name.lastName, 'i')
          });

          console.log(`   Author: ${author.name.firstName} ${author.name.lastName}`);
          console.log(`   Institution: ${author.affiliation?.institution || 'Unknown'}`);
          console.log(`   Potential Match: ${potentialUser ? `✅ ${potentialUser.email}` : '❌ No match found'}`);
        }
      }
    }

    // Check for duplicate users that might need consolidation
    console.log('\n🔍 DUPLICATE USER ANALYSIS');
    console.log('-'.repeat(40));

    const duplicateUsers = await User.aggregate([
      {
        $group: {
          _id: {
            firstName: '$name.firstName',
            lastName: '$name.lastName',
            institution: '$affiliation.organization'
          },
          count: { $sum: 1 },
          users: { $push: { _id: '$_id', email: '$email' } }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 10 }
    ]);

    console.log(`👥 Potential Duplicate Users: ${duplicateUsers.length}`);
    duplicateUsers.forEach((dup, index) => {
      console.log(`\n${index + 1}. ${dup._id.firstName} ${dup._id.lastName} at ${dup._id.institution}`);
      console.log(`   Count: ${dup.count} users`);
      dup.users.forEach(user => {
        console.log(`   - ${user.email} (ID: ${user._id})`);
      });
    });

    // Summary and recommendations
    console.log('\n📊 SUMMARY & RECOMMENDATIONS');
    console.log('=' .repeat(60));

    const linkingPercentage = allPresentations.length > 0 ? 
      Math.round((presentationsWithUsers.length / allPresentations.length) * 100) : 0;

    console.log(`✅ User Linking Status: ${linkingPercentage}% complete`);
    console.log(`📊 Linked Presentations: ${presentationsWithUsers.length}/${allPresentations.length}`);
    console.log(`⚠️  Unlinked Presentations: ${presentationsWithoutUsers.length}`);

    if (presentationsWithoutUsers.length > 0) {
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      console.log('1. Run user linking script to connect authors to existing users');
      console.log('2. Create missing user accounts for unmatched authors');
      console.log('3. Resolve duplicate user accounts');
      console.log('4. Validate author name spellings and institutional affiliations');
    } else {
      console.log('\n🎉 All presentations are properly linked to users!');
    }

  } catch (error) {
    console.error('❌ Error checking user associations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

checkUserAssociations();
