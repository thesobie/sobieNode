---
layout: default
title: Memorial System
nav_order: 7
description: "In memoriam user management and memorial features"
---

# SOBIE Memorial System Documentation
{: .fs-8 }

## Overview
The SOBIE Memorial System provides a respectful way to honor deceased community members while maintaining their profiles and contributions in the platform. This system allows administrators to designate users with an "in memoriam" status and display appropriate memorial information.

## Features Implemented

### 🏗️ **Core Infrastructure**

#### User Model Enhancements (`src/models/User.js`)
- **New Role**: Added `'in-memoriam'` to the roles enum
- **Memorial Fields**: Added comprehensive memorial data structure:
  ```javascript
  memorial: {
    dateOfPassing: Date,          // Required for memorial users
    memorialNote: String,         // Optional tribute message (max 500 chars)
    addedBy: ObjectId,           // Admin who added memorial status
    addedDate: Date              // When memorial status was added
  }
  ```

#### Virtual Properties
- **`isInMemoriam`**: Quick check for memorial status
- **`memorialDisplay`**: Formatted memorial information for display:
  ```javascript
  {
    dateOfPassing: Date,
    memorialNote: String,
    yearsPassed: Number,
    formattedDate: String       // "January 1, 2023" format
  }
  ```

#### Pre-save Middleware
- **Automatic Validation**: Ensures memorial users have required fields
- **Status Management**: Sets users as inactive when memorial status is added
- **Data Cleanup**: Removes memorial data when role is removed

#### Static Methods
- **`findMemorialUsers(options)`**: Query memorial users with optional year filter
- **`addMemorialStatus(userId, data, adminId)`**: Add memorial designation
- **`removeMemorialStatus(userId)`**: Remove memorial designation
- **`getMemorialStats()`**: Analytics for memorial users by year

### 🛡️ **API Layer**

#### Admin Routes (`src/routes/admin.js`)
- `GET /api/admin/memorial/users` - List all memorial users
- `GET /api/admin/memorial/users?year=2023` - Filter by year of passing
- `GET /api/admin/memorial/stats` - Memorial statistics
- `POST /api/admin/memorial/:userId/add` - Add memorial status
- `PUT /api/admin/memorial/:userId/update` - Update memorial information
- `DELETE /api/admin/memorial/:userId/remove` - Remove memorial status

#### Controller Functions (`src/controllers/adminController.js`)
- **`getMemorialUsers`**: Retrieve and filter memorial users
- **`addMemorialStatus`**: Add memorial designation with validation
- **`updateMemorialInfo`**: Update memorial details
- **`removeMemorialStatus`**: Remove memorial status
- **`getMemorialStats`**: Generate memorial analytics

#### Validation Middleware (`src/middleware/adminValidation.js`)
- **`validateMemorialData`**: Validates memorial form data:
  - Date of passing is required and cannot be in the future
  - Memorial note is optional but limited to 500 characters

### 🌐 **Public Interface**

#### Profile Display (`src/controllers/profileController.js`)
- **Enhanced Public Profiles**: Memorial users remain viewable even when inactive
- **Memorial Information**: Automatically included in public profiles
- **Privacy Respect**: Memorial display respects existing privacy settings

#### User Model Integration (`src/models/User.js`)
- **`getPublicProfile()` Enhancement**: Always includes memorial info for memorial users
- **Graceful Display**: Memorial information appears alongside regular profile data

## Usage Examples

### Adding Memorial Status (Admin)
```javascript
// POST /api/admin/memorial/:userId/add
{
  "dateOfPassing": "2023-06-15",
  "memorialNote": "Dr. Smith was a pioneering educator who made significant contributions to biomedical engineering education."
}
```

### Querying Memorial Users
```javascript
// Get all memorial users
const memorialUsers = await User.findMemorialUsers();

// Get memorial users from specific year
const users2023 = await User.findMemorialUsers({ year: 2023 });

// Get memorial statistics
const stats = await User.getMemorialStats();
```

### Memorial Display in Public Profile
```javascript
{
  "memorial": {
    "dateOfPassing": "2023-06-15T00:00:00.000Z",
    "memorialNote": "Respected member who contributed significantly...",
    "yearsPassed": 2,
    "formattedDate": "June 15, 2023"
  }
}
```

## System Behavior

### Memorial User Status
- **Activity**: Memorial users are automatically set as inactive
- **Visibility**: Remain visible in public profiles and searches
- **Authentication**: Cannot log in (inactive status)
- **Data Preservation**: All historical data and contributions preserved

### Admin Controls
- **Access Control**: Only admin and organizer roles can manage memorial status
- **Audit Trail**: Tracks who added memorial status and when
- **Data Validation**: Ensures required fields and prevents future dates

### Integration Points
- **Search Results**: Memorial users appear in directory searches
- **Analytics**: Included in historical data and statistics
- **Profile Views**: Memorial information displays respectfully
- **Name Cards**: Memorial users can still have name cards generated

## Database Impact

### New Indexes
- Memorial fields are indexed for efficient querying by year and status

### Data Migration
- Existing users unaffected
- Memorial fields are optional and only populated when status is added
- Backward compatibility maintained

### Performance
- Minimal impact on existing queries
- Efficient memorial-specific queries with proper indexing

## Security & Privacy

### Access Control
- Memorial management restricted to admin roles
- Memorial information respects existing privacy settings
- Public memorial display is always shown regardless of privacy (respectful remembrance)

### Data Protection
- Memorial notes are limited and validated
- Admin actions are logged with user attribution
- Memorial status can be removed if added in error

## Testing

The system includes comprehensive test coverage:
- **Unit Tests**: All memorial methods and validations
- **Integration Tests**: API endpoints and workflow
- **Demo Scripts**: 
  - `test-memorial-system.js` - Basic functionality testing
  - `memorial-system-guide.js` - Complete demonstration

## Future Enhancements

Potential additions for future versions:
1. **Memorial Gallery**: Photo galleries for memorial users
2. **Annual Memorial Page**: Dedicated page honoring those passed each year
3. **Memorial Notifications**: Email notifications to community when memorial status is added
4. **Enhanced Analytics**: Memorial trends and community impact metrics
5. **Memorial Events**: Integration with conference memorial sessions

## Implementation Summary

✅ **Complete Memorial Role System**
- Added 'in-memoriam' role to User model
- Comprehensive memorial data structure
- Automatic status management and validation

✅ **Admin Management Interface**
- Full CRUD operations for memorial status
- Validation and error handling
- Analytics and reporting capabilities

✅ **Public Display Integration**
- Memorial information in public profiles
- Respectful formatting and display
- Privacy-aware memorial visibility

✅ **Data Quality & Security**
- Input validation and sanitization
- Admin-only access controls
- Audit trail for memorial actions

The memorial system is now fully operational and provides a dignified way to honor deceased SOBIE community members while preserving their contributions and legacy within the platform.
