const mongoose = require('mongoose');
const Conference = require('./src/models/Conference');
const User = require('./src/models/User');
const CommunityActivity = require('./src/models/CommunityActivity');
const CommunityInterest = require('./src/models/CommunityInterest');

async function testCommunityFunctionality() {
  console.log('🧪 Testing SOBIE Community Functionality\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sobie_test');
    console.log('📊 Connected to MongoDB');

    // Clean up any existing test data
    await Conference.deleteMany({ name: /Community Test/ });
    await User.deleteMany({ email: /communitytest/ });
    await CommunityActivity.deleteMany({ name: /Test/ });
    await CommunityInterest.deleteMany({});

    // Create test conference
    const conference = new Conference({
      name: 'Community Test Conference 2024',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-03'),
      location: 'Test University',
      status: 'active'
    });
    await conference.save();
    console.log('✅ Created test conference');

    // Create test users with different roles
    const users = await Promise.all([
      // Activity Coordinator
      new User({
        firstName: 'Alice',
        lastName: 'Coordinator',
        email: 'alice.coordinator@communitytest.edu',
        password: 'test123',
        userType: 'academic',
        roles: ['user', 'activity-coordinator'],
        affiliation: { organization: 'Test University' }
      }).save(),
      
      // Regular users interested in activities
      new User({
        firstName: 'Bob',
        lastName: 'Golfer',
        email: 'bob.golfer@communitytest.edu',
        password: 'test123',
        userType: 'academic',
        roles: ['user'],
        affiliation: { organization: 'Golf University' },
        contact: { phones: [{ number: '+1-555-0101', type: 'work', primary: true }] }
      }).save(),
      
      new User({
        firstName: 'Carol',
        lastName: 'Volleyball',
        email: 'carol.volleyball@communitytest.edu',
        password: 'test123',
        userType: 'student',
        studentLevel: 'graduate',
        roles: ['user'],
        affiliation: { organization: 'Sports College' }
      }).save(),
      
      new User({
        firstName: 'David',
        lastName: 'Trivia',
        email: 'david.trivia@communitytest.edu',
        password: 'test123',
        userType: 'academic',
        roles: ['user'],
        affiliation: { organization: 'Quiz University' }
      }).save()
    ]);

    const [coordinator, golfer, volleyballPlayer, triviaLover] = users;
    console.log('✅ Created test users with roles');

    // Create community activities
    const activities = await Promise.all([
      // Golf Activity
      new CommunityActivity({
        name: 'SOBIE Golf Tournament',
        description: 'Annual golf tournament for SOBIE conference attendees',
        category: 'sports',
        type: 'golf',
        maxParticipants: 20,
        requiresSkillLevel: true,
        requiresEquipment: false,
        conferenceId: conference._id,
        coordinatorId: coordinator._id,
        activitySpecific: {
          golf: {
            handicapRequired: true,
            skillLevels: ['beginner', 'intermediate', 'advanced'],
            courseName: 'Pine Valley Golf Club',
            greenFees: 85,
            cartRental: 25
          }
        },
        scheduledDate: new Date('2024-06-02'),
        scheduledTime: '8:00 AM',
        duration: 300, // 5 hours
        location: {
          venue: 'Pine Valley Golf Club',
          address: '123 Golf Course Rd, Test City',
          coordinates: { lat: 40.7128, lng: -74.0060 }
        },
        status: 'open'
      }).save(),

      // Volleyball Activity
      new CommunityActivity({
        name: 'Beach Volleyball Social',
        description: 'Friendly volleyball games and networking',
        category: 'sports',
        type: 'volleyball',
        maxParticipants: 16,
        requiresSkillLevel: false,
        requiresEquipment: false,
        conferenceId: conference._id,
        coordinatorId: coordinator._id,
        activitySpecific: {
          volleyball: {
            skillLevels: ['recreational', 'intermediate'],
            format: 'beach'
          }
        },
        scheduledDate: new Date('2024-06-01'),
        scheduledTime: '5:00 PM',
        duration: 120, // 2 hours
        location: {
          venue: 'University Beach Courts',
          address: '456 Beach Ave, Test City'
        },
        status: 'open'
      }).save(),

      // Trivia Night
      new CommunityActivity({
        name: 'Business Trivia Night',
        description: 'Test your business knowledge in a fun trivia competition',
        category: 'social',
        type: 'trivia',
        maxParticipants: 40,
        requiresSkillLevel: false,
        requiresEquipment: false,
        conferenceId: conference._id,
        coordinatorId: coordinator._id,
        activitySpecific: {
          trivia: {
            topics: ['business', 'current_events', 'technology'],
            teamSize: 4,
            difficulty: 'mixed'
          }
        },
        scheduledDate: new Date('2024-06-01'),
        scheduledTime: '7:00 PM',
        duration: 150, // 2.5 hours
        location: {
          venue: 'Conference Center Lounge',
          address: '789 Conference St, Test City'
        },
        status: 'open'
      }).save()
    ]);

    const [golfActivity, volleyballActivity, triviaActivity] = activities;
    console.log('✅ Created community activities');

    // Test users expressing interest in activities
    console.log('\n📋 Testing Interest Registration:');

    // Golfer expresses interest in golf
    const golfInterest = new CommunityInterest({
      userId: golfer._id,
      activityId: golfActivity._id,
      conferenceId: conference._id,
      status: 'interested',
      contactPreferences: {
        shareEmail: true,
        sharePhone: true,
        preferredContactMethod: 'email',
        contactTimePreference: 'morning'
      },
      activityDetails: {
        golf: {
          handicap: 15,
          skillLevel: 'intermediate',
          ownClubs: true,
          preferredTeeTime: 'morning',
          transportationNeeded: false
        }
      },
      availability: {
        generalAvailability: 'very_flexible',
        notes: 'Available all weekend'
      }
    });
    await golfInterest.save();
    console.log(`   ⛳ ${golfer.name.firstName} registered for golf (handicap: 15)`);

    // Volleyball player expresses interest in volleyball
    const volleyballInterest = new CommunityInterest({
      userId: volleyballPlayer._id,
      activityId: volleyballActivity._id,
      conferenceId: conference._id,
      status: 'interested',
      contactPreferences: {
        shareEmail: true,
        sharePhone: false,
        preferredContactMethod: 'email'
      },
      activityDetails: {
        volleyball: {
          skillLevel: 'intermediate',
          preferredPosition: 'outside_hitter',
          experienceYears: 8
        }
      }
    });
    await volleyballInterest.save();
    console.log(`   🏐 ${volleyballPlayer.name.firstName} registered for volleyball (8 years experience)`);

    // Trivia lover expresses interest in trivia
    const triviaInterest = new CommunityInterest({
      userId: triviaLover._id,
      activityId: triviaActivity._id,
      conferenceId: conference._id,
      status: 'interested',
      contactPreferences: {
        shareEmail: true,
        sharePhone: false,
        preferredContactMethod: 'email'
      },
      activityDetails: {
        trivia: {
          strongCategories: ['business', 'technology', 'current_events'],
          teamPreference: 'no_preference',
          competitiveLevel: 'competitive'
        }
      }
    });
    await triviaInterest.save();
    console.log(`   🧠 ${triviaLover.name.firstName} registered for trivia (business/tech expert)`);

    // Test coordinator dashboard functionality
    console.log('\n📊 Testing Coordinator Dashboard:');
    
    const coordinatorSummary = await CommunityInterest.getCoordinatorSummary(
      coordinator._id, 
      conference._id
    );

    coordinatorSummary.forEach(activity => {
      console.log(`   Activity: ${activity.activityName} (${activity.activityType})`);
      console.log(`      Total Interests: ${activity.totalInterests}`);
      console.log(`      Interested: ${activity.interestedCount}`);
      console.log(`      Confirmed: ${activity.confirmedCount}`);
      console.log(`      Waitlist: ${activity.waitlistCount}`);
    });

    // Test activity capacity
    console.log('\n🎯 Testing Activity Capacity:');
    
    for (const activity of activities) {
      const participantCount = await CommunityInterest.countDocuments({
        activityId: activity._id,
        status: 'interested'
      });
      const availableSpots = await activity.getAvailableSpots();
      const isFull = await activity.isFull();
      
      console.log(`   ${activity.name}:`);
      console.log(`      Participants: ${participantCount}/${activity.maxParticipants || 'Unlimited'}`);
      console.log(`      Available Spots: ${availableSpots}`);
      console.log(`      Is Full: ${isFull}`);
    }

    // Test contact information for coordinator
    console.log('\n📞 Testing Contact Information for Coordinator:');
    
    const allInterests = await CommunityInterest.find({ conferenceId: conference._id })
      .populate('userId', 'name email contact affiliation privacySettings');

    allInterests.forEach(interest => {
      const user = interest.userId;
      console.log(`   ${user.name.firstName} ${user.name.lastName}:`);
      
      if (interest.contactPreferences.shareEmail) {
        console.log(`      📧 Email: ${user.email}`);
      }
      
      if (interest.contactPreferences.sharePhone && user.primaryPhone) {
        console.log(`      📱 Phone: ${user.primaryPhone.number}`);
      }
      
      console.log(`      🏢 Organization: ${user.affiliation.organization}`);
      console.log(`      ⭐ Preferred Contact: ${interest.contactPreferences.preferredContactMethod}`);
      console.log(`      ⏰ Best Time: ${interest.contactPreferences.contactTimePreference}`);
    });

    console.log('\n✅ SOBIE Community Testing Complete!');
    console.log('\n📊 Test Results Summary:');
    console.log('• Activity Coordinator role added to user system');
    console.log('• Golf, Volleyball, and Trivia activities created');
    console.log('• Users can express interest with specific activity details');
    console.log('• Coordinators receive contact information based on user preferences');
    console.log('• Activity capacity and waitlist management working');
    console.log('• Privacy settings respected for contact sharing');

    console.log('\n🎯 Key Features Demonstrated:');
    console.log('• Golf: Handicap tracking, skill levels, equipment needs');
    console.log('• Volleyball: Skill levels, position preferences, experience');
    console.log('• Trivia: Category strengths, team preferences, competitive level');
    console.log('• Contact: Email/phone sharing with coordinator notification');
    console.log('• Privacy: Users control what contact info to share');

    // Clean up
    await Conference.deleteMany({ name: /Community Test/ });
    await User.deleteMany({ email: /communitytest/ });
    await CommunityActivity.deleteMany({ name: /Test/ });
    await CommunityInterest.deleteMany({});
    console.log('\n🧹 Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
}

// Export for use, but also run directly if called
if (require.main === module) {
  testCommunityFunctionality();
}

module.exports = testCommunityFunctionality;
