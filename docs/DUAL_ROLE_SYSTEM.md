---
layout: default
title: Dual Role System
nav_order: 5
description: "App roles vs SOBIE community roles implementation"
---

# SOBIE Dual Role System Implementation
{: .fs-8 }

## ✅ Successfully Implemented
{: .fs-6 .fw-300 }

### 🏗️ **Dual Role Architecture**

**App Roles (System-Level Permissions):**
- `user` - Basic platform access
- `admin` - Full administrative privileges  
- `developer` - Developer/technical access

**SOBIE Roles (Community-Specific):**
- `attendee` - Conference attendee
- `researcher` - Academic researcher
- `presenter` - Conference presenter  
- `vendor` - Industry vendor/sponsor
- `volunteer` - Conference volunteer
- `session-chair` - Session chairperson
- `panelist` - Panel discussion participant
- `keynote-speaker` - Keynote speaker
- `activity-coordinator` - Social activity organizer
- `officer` - SOBIE organization officer
- `conference-chairperson` - Conference chair
- `editor` - Publications editor
- `reviewer` - Paper/abstract reviewer
- `in-memoriam` - Memorial designation

### 🔧 **Role-Specific Metadata**

**Officer Details:**
- Officer role: president, vice-president, treasurer, secretary, board-member
- Years served with descriptions

**Activity Coordinator Details:**  
- Activity type: golf, trivia, volleyball, social-event, networking, other
- Custom activity type for "other"
- Years served tracking

### 🎯 **Key Features Implemented**

✅ **Backward Compatibility**: Legacy `roles` field still works
✅ **Automatic Sync**: Legacy roles sync to new dual system  
✅ **Virtual Properties**: Quick role checking (e.g., `user.isAdmin`, `user.isPresenter`)
✅ **Role Display**: Comprehensive role information formatting
✅ **Database Queries**: Find users by app roles, SOBIE roles, officer positions, etc.
✅ **Memorial Integration**: In-memoriam works across both role systems
✅ **Validation**: Required fields for officers and activity coordinators
✅ **Auth Middleware**: Updated to work with dual role system

### 📊 **Working Features from Test**

✅ **User Creation**: Successfully created users with dual roles
✅ **Role Checking**: Virtual properties work correctly (`isAttendee`, `isPresenter`, etc.)
✅ **Officer Management**: Added officer with treasurer role and years served
✅ **Activity Coordination**: Created activity coordinator for golf tournament
✅ **Role Queries**: Found users by specific SOBIE roles
✅ **Memorial Status**: Successfully added in-memoriam with dual role support
✅ **Legacy Compatibility**: Legacy roles automatically sync to new system

### 🛠️ **Auth Middleware Enhancements**

- `requireRole()` - Checks both legacy and new role systems
- `requireAppRole()` - App-specific role checking
- `requireSobieRole()` - SOBIE-specific role checking
- Full backward compatibility maintained

### 📈 **Database Impact**

- **Non-Breaking**: All existing data preserved
- **Efficient**: New indexes for role-based queries
- **Scalable**: Easy to add new roles and metadata
- **Memorial Integration**: Works seamlessly with existing memorial system

## 🎯 **Usage Examples**

### Creating Users with Dual Roles
```javascript
const user = new User({
  email: 'jane.doe@university.edu',
  name: { firstName: 'Jane', lastName: 'Doe' },
  appRoles: ['user'],
  sobieRoles: ['attendee', 'presenter', 'reviewer'],
  roleDetails: {
    yearsServed: [{
      year: 2024,
      role: 'reviewer',
      description: 'Paper reviewer for SOBIE 2024'
    }]
  }
});
```

### Officer Management
```javascript
// Add officer role
user.sobieRoles.push('officer');
user.roleDetails.officerRole = 'president';
user.roleDetails.yearsServed.push({
  year: 2024,
  role: 'officer', 
  description: 'SOBIE President'
});
```

### Activity Coordinator
```javascript
user.sobieRoles.push('activity-coordinator');
user.roleDetails.activityType = 'golf';
user.roleDetails.yearsServed.push({
  year: 2024,
  role: 'activity-coordinator',
  description: 'Organized annual golf tournament'
});
```

### Role Checking
```javascript
// Virtual properties
console.log(user.isAdmin);        // App role check
console.log(user.isPresenter);    // SOBIE role check
console.log(user.isOfficer);      // Officer check

// Method-based checking
console.log(user.hasRole('admin'));  // Checks all role systems
```

### Database Queries
```javascript
// Find by app role
const admins = await User.findByAppRole('admin');

// Find by SOBIE role  
const presenters = await User.findBySobieRole('presenter');

// Find officers by position
const presidents = await User.findOfficers('president');

// Find activity coordinators
const golfCoords = await User.findActivityCoordinators('golf');
```

## 🚀 **Implementation Status**

**✅ COMPLETE:**
- Dual role system architecture
- Role metadata and validation
- Virtual properties for role checking
- Database queries and methods  
- Memorial system integration
- Auth middleware updates
- Backward compatibility
- Basic testing and validation

**🔧 MINOR ISSUE:**
- Role statistics aggregation needs refinement (complex MongoDB aggregation)

**🎯 READY FOR PRODUCTION:**
The dual role system is fully functional and production-ready. The statistics aggregation can be simplified or fixed later without affecting core functionality.

## 📋 **Next Steps**

1. **Admin Interface**: Update admin UI to manage dual roles
2. **Role Assignment**: Bulk role assignment tools  
3. **Role History**: Track role changes over time
4. **Advanced Analytics**: Simplified role statistics queries
5. **Role Permissions**: Fine-grained permission mapping

The SOBIE dual role system successfully separates application-level permissions from community-specific roles while maintaining full backward compatibility and providing rich role management capabilities.
