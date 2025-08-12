# SOBIE Community Activities System

## Overview

The SOBIE Community Activities System enables conference attendees to discover, express interest in, and participate in various community activities like golf, volleyball, trivia, and more. Activity coordinators can manage these activities and receive contact information from interested participants.

## Key Features

### 🎯 **Activity Management**
- **Golf Activities**: Handicap tracking, skill levels, equipment needs, tee time preferences
- **Volleyball Activities**: Skill levels, position preferences, playing experience
- **Trivia Activities**: Category strengths, team preferences, competitive levels
- **General Activities**: Flexible custom fields for any activity type

### 👥 **User Roles**
- **Activity Coordinator**: New role added to manage community activities
- **Participants**: Regular users who can express interest in activities
- **Admins**: Can create activities and manage the system

### 🔒 **Privacy & Contact Management**
- Users control what contact information to share (email, phone)
- Preferred contact methods and times
- Privacy settings respected for all communications
- Activity coordinators only receive information users consent to share

## Database Models

### CommunityActivity Model
```javascript
{
  name: String,                    // Activity name
  description: String,             // Activity description
  category: String,                // sports, social, educational, etc.
  type: String,                    // golf, volleyball, trivia, etc.
  maxParticipants: Number,         // Capacity limit
  coordinatorId: ObjectId,         // Activity coordinator
  conferenceId: ObjectId,          // Associated conference
  activitySpecific: {             // Activity-specific fields
    golf: {
      handicapRequired: Boolean,
      skillLevels: [String],
      courseName: String,
      greenFees: Number
    },
    volleyball: {
      skillLevels: [String],
      format: String              // beach, indoor, both
    },
    trivia: {
      topics: [String],
      teamSize: Number,
      difficulty: String
    }
  },
  location: {
    venue: String,
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  scheduledDate: Date,
  scheduledTime: String,
  duration: Number,               // in minutes
  status: String                  // planning, open, full, etc.
}
```

### CommunityInterest Model
```javascript
{
  userId: ObjectId,               // User expressing interest
  activityId: ObjectId,           // Activity of interest
  conferenceId: ObjectId,         // Conference context
  status: String,                 // interested, confirmed, waitlist, etc.
  contactPreferences: {
    shareEmail: Boolean,
    sharePhone: Boolean,
    preferredContactMethod: String,
    contactTimePreference: String
  },
  activityDetails: {             // Activity-specific user details
    golf: {
      handicap: Number,
      skillLevel: String,
      ownClubs: Boolean,
      preferredTeeTime: String
    },
    volleyball: {
      skillLevel: String,
      preferredPosition: String,
      experienceYears: Number
    },
    trivia: {
      strongCategories: [String],
      teamPreference: String,
      competitiveLevel: String
    }
  },
  availability: {
    generalAvailability: String,
    notes: String
  },
  communicationLog: [{            // Coordinator communication history
    date: Date,
    type: String,
    method: String,
    notes: String,
    sentBy: ObjectId
  }]
}
```

## API Endpoints

### User Endpoints
- `GET /api/community/:conferenceId/activities` - Get available activities
- `GET /api/community/:conferenceId/my-interests` - Get user's interests
- `POST /api/community/:conferenceId/activities/:activityId/interest` - Express interest
- `PUT /api/community/:conferenceId/activities/:activityId/interest` - Update interest
- `DELETE /api/community/:conferenceId/activities/:activityId/interest` - Withdraw interest

### Coordinator Endpoints
- `GET /api/community/:conferenceId/coordinator/dashboard` - Coordinator dashboard
- `GET /api/community/:conferenceId/coordinator/activities/:activityId/participants` - Get participants

### Admin Endpoints
- `POST /api/community/:conferenceId/activities` - Create new activity

## User Workflow

### 1. **Expressing Interest**
```javascript
// Example: User expresses interest in golf
POST /api/community/64f7b1234567890123456789/activities/64f7b1234567890123456790/interest
{
  "contactPreferences": {
    "shareEmail": true,
    "sharePhone": true,
    "preferredContactMethod": "email",
    "contactTimePreference": "morning"
  },
  "activityDetails": {
    "golf": {
      "handicap": 15,
      "skillLevel": "intermediate",
      "ownClubs": true,
      "preferredTeeTime": "morning",
      "transportationNeeded": false
    }
  },
  "availability": {
    "generalAvailability": "very_flexible",
    "notes": "Available all weekend"
  }
}
```

### 2. **Coordinator Notification**
When a user expresses interest, the activity coordinator automatically receives:
- User's contact information (based on privacy settings)
- Activity-specific details (handicap, skill level, etc.)
- Availability information
- Preferred contact method and timing

### 3. **Privacy Controls**
Users can control:
- Whether to share email address
- Whether to share phone number
- Preferred contact method (email, phone, both)
- Best time to be contacted (morning, afternoon, evening, anytime)

## Activity Types

### 🏌️ **Golf Activities**
- **Handicap Tracking**: Optional handicap requirement and tracking
- **Skill Levels**: Beginner, Intermediate, Advanced, Professional
- **Equipment**: Track if users have their own clubs
- **Tee Times**: Preferred timing (early morning, morning, afternoon)
- **Transportation**: Whether users need transportation to course

### 🏐 **Volleyball Activities**
- **Skill Levels**: Recreational, Intermediate, Competitive
- **Positions**: Setter, Outside Hitter, Middle Blocker, Libero, Any
- **Experience**: Years of playing experience
- **Format**: Beach, Indoor, or Both

### 🧠 **Trivia Activities**
- **Categories**: History, Science, Sports, Entertainment, Geography, etc.
- **Team Preferences**: Form new team, join existing, no preference
- **Competitive Level**: Casual, Competitive, Very Competitive
- **Team Size**: Configurable team size (default 4)

### 🍽️ **Dining Activities**
- **Dietary Restrictions**: Vegetarian, Vegan, Gluten-free, Kosher, Halal
- **Cuisine Preferences**: User-specified cuisine types
- **Price Preferences**: Budget, Moderate, Upscale, Any
- **Allergies**: Specific allergy information

## Coordinator Features

### 📊 **Dashboard**
- Activity overview with participant counts
- Interest status breakdown (interested, confirmed, waitlist)
- Recent communications log
- Overall statistics across all managed activities

### 📞 **Contact Management**
- Access to participant contact information (respecting privacy)
- Communication history tracking
- Bulk communication capabilities
- Contact preference filtering

### 🎯 **Capacity Management**
- Real-time participant tracking
- Automatic waitlist management when activities reach capacity
- Available spots calculation
- Full activity notifications

## Implementation Benefits

### 🔐 **Privacy-First Design**
- Users maintain full control over contact information sharing
- Granular privacy settings for different types of information
- Consent-based communication system

### 📱 **Mobile-Friendly**
- RESTful API design supports web and mobile applications
- Real-time updates for activity status changes
- Push notification ready architecture

### 🔄 **Scalable Architecture**
- Flexible activity type system supports any community activity
- Modular design allows easy addition of new activity types
- Conference-scoped activities for multi-conference support

### 📈 **Analytics Ready**
- Comprehensive participation tracking
- Communication history for follow-up analysis
- Activity popularity metrics
- User engagement statistics

## Security Considerations

- All endpoints require authentication
- Role-based access control for coordinators and admins
- Privacy settings enforcement at API level
- Contact information filtered based on user consent
- Activity coordinator verification for participant access

## Future Enhancements

- **Real-time Notifications**: WebSocket integration for instant updates
- **Calendar Integration**: Export activities to personal calendars
- **Payment Integration**: Handle paid activities (golf fees, etc.)
- **Team Formation**: Automatic team creation for team-based activities
- **Rating System**: Post-activity feedback and coordinator ratings
- **Location Services**: GPS integration for activity locations
- **Social Features**: Activity discussion forums and photo sharing

---

This system transforms conference networking from passive to active, enabling meaningful connections through shared interests and activities while respecting user privacy and preferences.
