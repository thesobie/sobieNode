/**
 * SOBIE Dual Role System - Working Demo
 * 
 * Demonstrates the core functionality of the dual role system
 * without complex aggregations that might have database-specific issues.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

async function demonstrateDualRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB\n');

    console.log('🎯 SOBIE DUAL ROLE SYSTEM - WORKING DEMO');
    console.log('='.repeat(50));

    // Clean up any existing test users
    await User.deleteMany({ 
      email: { $regex: /@example\.sobie/ } 
    });

    // 1. Create an Academic Researcher/Presenter
    console.log('\n👩‍🔬 Creating Academic Researcher/Presenter');
    const academic = new User({
      email: 'dr.sarah.jones@example.sobie',
      password: 'SecurePass123!',
      name: {
        firstName: 'Sarah',
        lastName: 'Jones'
      },
      userType: 'academic',
      affiliation: {
        organization: 'MIT',
        department: 'Biomedical Engineering'
      },
      appRoles: ['user'],
      sobieRoles: ['attendee', 'researcher', 'presenter', 'reviewer']
    });
    await academic.save();
    
    console.log(`✅ Created: ${academic.name.firstName} ${academic.name.lastName}`);
    console.log(`   App Roles: ${academic.appRoles.join(', ')}`);
    console.log(`   SOBIE Roles: ${academic.sobieRoles.join(', ')}`);
    console.log(`   Is Researcher: ${academic.isResearcher}`);
    console.log(`   Is Presenter: ${academic.isPresenter}`);

    // 2. Create a SOBIE Officer (President)
    console.log('\n👔 Creating SOBIE Officer (President)');
    const president = new User({
      email: 'president@example.sobie',
      password: 'SecurePass123!',
      name: {
        firstName: 'Michael',
        lastName: 'Chen'
      },
      userType: 'academic',
      affiliation: {
        organization: 'Stanford University'
      },
      appRoles: ['user', 'admin'],
      sobieRoles: ['attendee', 'officer'],
      roleDetails: {
        officerRole: 'president',
        yearsServed: [
          {
            year: 2024,
            role: 'officer',
            description: 'SOBIE President - Leading the organization'
          },
          {
            year: 2023,
            role: 'conference-chairperson',
            description: 'Conference Chair for SOBIE 2023'
          }
        ]
      }
    });
    await president.save();
    
    console.log(`✅ Created: ${president.name.firstName} ${president.name.lastName}`);
    console.log(`   App Roles: ${president.appRoles.join(', ')}`);
    console.log(`   SOBIE Roles: ${president.sobieRoles.join(', ')}`);
    console.log(`   Officer Role: ${president.roleDetails.officerRole}`);
    console.log(`   Is Admin: ${president.isAdmin}`);
    console.log(`   Is Officer: ${president.isOfficer}`);

    // 3. Create an Activity Coordinator
    console.log('\n🏌️ Creating Activity Coordinator (Golf)');
    const coordinator = new User({
      email: 'golf.coordinator@example.sobie',
      password: 'SecurePass123!',
      name: {
        firstName: 'Tom',
        lastName: 'Wilson'
      },
      userType: 'other',
      affiliation: {
        organization: 'MedTech Corp'
      },
      appRoles: ['user'],
      sobieRoles: ['attendee', 'activity-coordinator'],
      roleDetails: {
        activityType: 'golf',
        yearsServed: [{
          year: 2024,
          role: 'activity-coordinator',
          description: 'Organized SOBIE 2024 Golf Tournament'
        }]
      }
    });
    await coordinator.save();
    
    console.log(`✅ Created: ${coordinator.name.firstName} ${coordinator.name.lastName}`);
    console.log(`   Activity Type: ${coordinator.roleDetails.activityType}`);
    console.log(`   Is Activity Coordinator: ${coordinator.isActivityCoordinator}`);

    // 4. Test Role-Based Queries
    console.log('\n🔍 Testing Role-Based Queries');
    
    const admins = await User.findByAppRole('admin');
    console.log(`📊 Admin users: ${admins.length}`);
    
    const researchers = await User.findBySobieRole('researcher');
    console.log(`📊 Researchers: ${researchers.length}`);
    
    const officers = await User.findOfficers();
    console.log(`📊 Officers: ${officers.length}`);
    if (officers.length > 0) {
      officers.forEach(officer => {
        console.log(`   - ${officer.name.firstName} ${officer.name.lastName}: ${officer.roleDetails?.officerRole}`);
      });
    }

    const activityCoords = await User.findActivityCoordinators();
    console.log(`📊 Activity Coordinators: ${activityCoords.length}`);
    if (activityCoords.length > 0) {
      activityCoords.forEach(coord => {
        console.log(`   - ${coord.name.firstName} ${coord.name.lastName}: ${coord.roleDetails?.activityType}`);
      });
    }

    // 5. Test Role Updates
    console.log('\n🔄 Testing Role Updates');
    const updatedAcademic = await User.updateUserRoles(academic._id, {
      sobieRoles: ['attendee', 'researcher', 'presenter', 'reviewer', 'editor'],
      roleDetails: {
        yearsServed: [{
          year: 2024,
          role: 'editor',
          description: 'Associate Editor for SOBIE Journal'
        }]
      }
    });
    
    console.log(`✅ Updated ${updatedAcademic.name.firstName}'s roles`);
    console.log(`   New SOBIE Roles: ${updatedAcademic.sobieRoles.join(', ')}`);
    console.log(`   Is Editor: ${updatedAcademic.isEditor}`);

    // 6. Test Memorial Integration
    console.log('\n🕊️ Testing Memorial Integration');
    const memorialUser = await User.addMemorialStatus(coordinator._id, {
      dateOfPassing: new Date('2024-03-15'),
      memorialNote: 'Tom was beloved by the SOBIE community for his enthusiasm in organizing golf tournaments.'
    }, president._id);
    
    console.log(`✅ Added memorial status for ${memorialUser.name.firstName} ${memorialUser.name.lastName}`);
    console.log(`   Is In Memoriam: ${memorialUser.isInMemoriam}`);
    console.log(`   Memorial Date: ${memorialUser.memorial.dateOfPassing.toLocaleDateString()}`);
    console.log(`   Still Activity Coordinator: ${memorialUser.isActivityCoordinator}`);

    // 7. Test Legacy Role Compatibility
    console.log('\n🔄 Testing Legacy Role Compatibility');
    const legacyUser = new User({
      email: 'legacy@example.sobie',
      password: 'SecurePass123!',
      name: {
        firstName: 'Legacy',
        lastName: 'User'
      },
      userType: 'academic',
      affiliation: {
        organization: 'Legacy University'
      },
      roles: ['user', 'admin', 'editor']  // Using legacy roles field
    });
    await legacyUser.save();
    
    console.log(`✅ Created legacy user: ${legacyUser.name.firstName} ${legacyUser.name.lastName}`);
    console.log(`   Legacy Roles: ${legacyUser.roles.join(', ')}`);
    console.log(`   Auto-synced App Roles: ${legacyUser.appRoles.join(', ')}`);
    console.log(`   Auto-synced SOBIE Roles: ${legacyUser.sobieRoles.join(', ')}`);
    console.log(`   Is Admin (legacy): ${legacyUser.isAdmin}`);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 DUAL ROLE SYSTEM DEMO COMPLETE!');
    console.log('='.repeat(50));

    console.log('\n✅ Key Features Demonstrated:');
    console.log('   🏗️  Dual role architecture (App + SOBIE)');
    console.log('   👔 Officer roles with metadata');
    console.log('   🎯 Activity coordinator roles');
    console.log('   🔍 Role-based database queries');
    console.log('   🔄 Dynamic role updates');
    console.log('   🕊️  Memorial system integration');
    console.log('   🔄 Legacy role compatibility');

    // Cleanup
    await User.deleteMany({ 
      email: { $regex: /@example\.sobie/ } 
    });
    console.log('\n🧹 Demo users cleaned up');

  } catch (error) {
    console.error('❌ Demo error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the demo
if (require.main === module) {
  demonstrateDualRoles();
}

module.exports = { demonstrateDualRoles };
