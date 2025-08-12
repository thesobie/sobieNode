# Communication System Documentation

## Overview

The SOBIE Conference Communication System provides comprehensive messaging, announcements, and notification capabilities with special support for schedule changes that preserve original information using strikethrough formatting.

## Features

### 🔗 **Core Messaging**
- **Direct Messages**: Person-to-person communication
- **Group Messages**: Multi-recipient messaging
- **Message Threading**: Reply and conversation tracking
- **Rich Content**: HTML formatting support
- **File Attachments**: Document and media sharing
- **Scheduled Messages**: Send messages at specified times

### 📢 **Announcements**
- **Conference-wide Announcements**: Broadcast to all attendees
- **Targeted Announcements**: Specific user groups (students, academics, roles)
- **Priority Levels**: Low, Normal, High, Urgent
- **Role-based Access**: Admin/Conference Chairperson/Editor permissions

### 📅 **Schedule Change Notifications**
- **Visual Change Tracking**: Original data with strikethrough formatting
- **Change Types**: Time, Location, Cancellation, Postponement
- **Automatic Notifications**: Affected users automatically notified
- **Rich HTML Formatting**: Clear before/after visualization

### 🔔 **Notification System**
- **Multi-channel Delivery**: In-app, Email, SMS, Push notifications
- **Notification Grouping**: Related notifications bundled
- **Status Tracking**: Read/Unread status management
- **Action Buttons**: Direct action links in notifications

## API Endpoints

### Messages

#### Get User Messages
```http
GET /api/communications/messages
```

**Query Parameters:**
- `type` - Message type (direct, announcement, schedule_change)
- `status` - Read status (read, unread)
- `conferenceId` - Filter by conference
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)
- `search` - Search in subject/content/sender

#### Get Specific Message
```http
GET /api/communications/messages/:messageId
```

**Response includes:**
- Message details with HTML content for schedule changes
- Thread messages if part of conversation
- User-specific read status

#### Send Message
```http
POST /api/communications/messages
```

**Body:**
```json
{
  "subject": "Meeting Request",
  "content": "Let's discuss the research proposal.",
  "recipientIds": ["user1_id", "user2_id"],
  "messageType": "direct",
  "priority": "normal",
  "conferenceId": "conference_id",
  "attachments": [
    {
      "filename": "proposal.pdf",
      "fileType": "application/pdf",
      "fileSize": 1024000,
      "url": "https://storage.example.com/files/proposal.pdf"
    }
  ],
  "scheduledSendTime": "2024-03-15T10:00:00Z"
}
```

#### Reply to Message
```http
POST /api/communications/messages/:messageId/reply
```

**Body:**
```json
{
  "content": "Thanks for the information!",
  "replyToAll": false
}
```

### Announcements

#### Send Announcement
```http
POST /api/communications/announcements
```
**Required Roles:** Admin, Conference Chairperson, Editor

**Body:**
```json
{
  "subject": "Important Conference Update",
  "content": "Please review the updated conference schedule.",
  "conferenceId": "conference_id",
  "priority": "high",
  "targetAudience": "all",
  "scheduledSendTime": "2024-03-15T09:00:00Z"
}
```

**Target Audience Options:**
- `all` - All active users
- `students` - Student user type only
- `academics` - Academic user type only
- `specific_roles` - Specified roles (requires `specificRoles` array)

### Schedule Changes

#### Send Schedule Change Notification
```http
POST /api/communications/schedule-changes
```
**Required Roles:** Admin, Editor

**Body:**
```json
{
  "sessionId": "session_id",
  "changeType": "time",
  "originalData": {
    "scheduledTime": "2024-03-15T10:00:00Z",
    "location": "Room A101"
  },
  "newData": {
    "scheduledTime": "2024-03-15T14:00:00Z",
    "location": "Room B205"
  },
  "reason": "Venue conflict resolution",
  "customMessage": "We apologize for any inconvenience caused by this change."
}
```

**Change Types:**
- `time` - Time modification
- `location` - Venue change
- `cancellation` - Session cancelled
- `postponement` - Session delayed
- `other` - Custom change type

### Notifications

#### Get User Notifications
```http
GET /api/communications/notifications
```

**Query Parameters:**
- `status` - Read status (read, unread)
- `type` - Notification type (message, announcement, schedule_change, system, community)
- `conferenceId` - Filter by conference
- `page` - Page number
- `limit` - Results per page
- `includeRead` - Include read notifications (default: true)

#### Mark Notification as Read
```http
PUT /api/communications/notifications/:notificationId/read
```

#### Mark Multiple Notifications as Read
```http
PUT /api/communications/notifications/mark-read
```

**Body:**
```json
{
  "notificationIds": ["notif1_id", "notif2_id"]
}
```

### Utility Endpoints

#### Get Communication Statistics
```http
GET /api/communications/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": {
      "total": 45,
      "unread": 3,
      "byType": {
        "direct": 30,
        "announcement": 10,
        "schedule_change": 5
      }
    },
    "notifications": {
      "total": 67,
      "unread": 8,
      "byType": {
        "message": 40,
        "announcement": 15,
        "schedule_change": 8,
        "system": 4
      }
    }
  }
}
```

#### Search Messages
```http
GET /api/communications/messages/search?q=research&type=direct
```

## Schedule Change HTML Formatting

The system automatically generates rich HTML for schedule changes with strikethrough formatting for original data:

### Example Output
```html
<div class="schedule-change-notification">
  <div class="change-header">
    <h3>⚠️ Schedule Change: TIME CHANGE</h3>
    <p><strong>Reason:</strong> Venue conflict resolution</p>
  </div>
  
  <div class="change-details">
    <div class="change-item">
      <strong>Time:</strong>
      <span class="original-value">March 15, 2024 10:00 AM</span>
      <span class="arrow">→</span>
      <span class="new-value">March 15, 2024 2:00 PM</span>
    </div>
    
    <div class="change-item">
      <strong>Location:</strong>
      <span class="original-value">Room A101</span>
      <span class="arrow">→</span>
      <span class="new-value">Room B205</span>
    </div>
  </div>
</div>
```

### CSS Styling
```css
.schedule-change-notification .original-value {
  text-decoration: line-through;
  color: #999;
  background-color: #ffe6e6;
  padding: 2px 4px;
  border-radius: 3px;
}

.schedule-change-notification .new-value {
  color: #d73527;
  background-color: #e6f3ff;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: bold;
}
```

## Models

### Message Model
```javascript
{
  subject: String,
  content: String,
  messageType: ['direct', 'announcement', 'schedule_change'],
  priority: ['low', 'normal', 'high', 'urgent'],
  senderId: ObjectId,
  recipients: [{
    userId: ObjectId,
    readStatus: ['unread', 'read'],
    readTimestamp: Date,
    deliveryStatus: ['pending', 'delivered', 'failed']
  }],
  scheduleChange: {
    changeType: String,
    originalData: Object,
    newData: Object
  },
  attachments: [{
    filename: String,
    fileType: String,
    fileSize: Number,
    url: String
  }],
  threadId: ObjectId,
  parentMessageId: ObjectId,
  isReply: Boolean,
  deliveryStatus: ['draft', 'sending', 'sent', 'failed'],
  scheduledSendTime: Date,
  actualSendTime: Date
}
```

### Notification Model
```javascript
{
  title: String,
  message: String,
  type: ['message', 'announcement', 'schedule_change', 'system', 'community'],
  priority: ['low', 'normal', 'high', 'urgent'],
  userId: ObjectId,
  status: ['unread', 'read'],
  channels: [{
    type: ['in_app', 'email', 'sms', 'push'],
    status: ['pending', 'sent', 'delivered', 'failed'],
    sentAt: Date,
    deliveredAt: Date
  }],
  actionRequired: Boolean,
  actionType: String,
  actionUrl: String,
  expiresAt: Date
}
```

## Usage Examples

### Send Direct Message with Attachment
```javascript
const messageData = {
  subject: "Research Collaboration",
  content: "I'd like to discuss a potential collaboration.",
  recipientIds: ["user123", "user456"],
  attachments: [{
    filename: "research_proposal.pdf",
    fileType: "application/pdf",
    fileSize: 1500000,
    url: "https://storage.example.com/files/proposal.pdf"
  }]
};

const response = await fetch('/api/communications/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(messageData)
});
```

### Send Conference Announcement
```javascript
const announcementData = {
  subject: "Conference Dinner Details",
  content: "Join us for the conference dinner at the Grand Hotel.",
  conferenceId: "conf123",
  priority: "normal",
  targetAudience: "all"
};

const response = await fetch('/api/communications/announcements', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(announcementData)
});
```

### Notify of Schedule Change
```javascript
const scheduleChangeData = {
  sessionId: "session123",
  changeType: "location",
  originalData: { location: "Room A" },
  newData: { location: "Online Meeting" },
  reason: "Technical difficulties with AV equipment",
  customMessage: "Please check your email for the meeting link."
};

const response = await fetch('/api/communications/schedule-changes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(scheduleChangeData)
});
```

## Integration Notes

### With Conference System
- Messages can be associated with specific conferences
- Schedule changes automatically notify affected presenters and co-authors
- Conference-specific announcements to registered participants

### With Community System
- Activity coordinators can message interested participants
- Community event updates and notifications
- Golf score updates and tournament announcements

### With User Roles
- Role-based access control for announcements
- Different permissions for message types
- Activity coordinators have messaging permissions for their activities

## Security Considerations

- All endpoints require authentication
- Role-based authorization for administrative functions
- Message recipients validated before sending
- File upload validation for attachments
- Rate limiting on message sending
- Privacy controls respect user preferences

## Performance Optimization

- Pagination for large message lists
- Efficient indexing on user, conference, and timestamp fields
- Background processing for bulk notifications
- Message search with full-text indexing
- Scheduled message processing via job queue

## Testing

Run the communication system tests:

```bash
node src/tests/communicationTests.js
```

This will test:
- Message creation and retrieval
- Notification system
- Schedule change HTML formatting
- Mark as read functionality
- Search and filtering

## Future Enhancements

- **Real-time Updates**: WebSocket integration for live notifications
- **Message Templates**: Pre-defined message formats
- **Advanced Formatting**: Rich text editor integration
- **Message Reactions**: Like/acknowledge functionality
- **Bulk Operations**: Mass message operations
- **Integration APIs**: External system webhooks
- **Analytics Dashboard**: Communication metrics and insights
