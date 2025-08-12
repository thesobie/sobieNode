# SOBIE User Suggestion System

## Overview

The SOBIE User Suggestion System allows users to collaboratively improve the quality and completeness of SOBIE historical data by submitting suggestions for edits, revisions, and additions. This crowd-sourced approach helps ensure the database remains accurate and comprehensive.

## Features

### For Users
- **Submit Suggestions**: Propose missing presentations, corrections, or additional information
- **Track Progress**: View status of submitted suggestions
- **Update Suggestions**: Modify pending suggestions before admin review
- **Email Notifications**: Receive updates when suggestions are reviewed or implemented

### For Administrators
- **Dashboard**: Comprehensive view of all suggestions with statistics
- **Review Workflow**: Approve or reject suggestions with comments
- **Implementation Tracking**: Mark approved suggestions as implemented
- **Filtering & Search**: Find suggestions by status, priority, category, or type
- **Analytics**: Real-time statistics and reporting

## Suggestion Types

1. **Missing Presentation** - Add presentations not in the database
2. **Missing Author** - Add authors to existing presentations
3. **Incorrect Information** - Correct errors in existing data
4. **Missing Conference Year** - Add missing SOBIE conference years
5. **Missing Session** - Add missing conference sessions
6. **Author Affiliation** - Update or correct author affiliations
7. **Presentation Details** - Enhance presentation information
8. **Service Record** - Add committee service, reviewing, etc.
9. **Award Recognition** - Add missing awards or honors
10. **Other** - General suggestions and improvements

## API Endpoints

### User Endpoints

#### Submit Suggestion
```http
POST /api/suggestions
Authorization: Bearer <token>
Content-Type: application/json

{
  "suggestionType": "missing_presentation",
  "targetType": "general",
  "title": "Missing Presentation Title",
  "description": "Detailed description of the suggestion",
  "suggestedChanges": {
    "presentationInfo": {
      "title": "Presentation Title",
      "authors": ["Author 1", "Author 2"],
      "year": 2020,
      "conference": "SOBIE 2020"
    }
  },
  "priority": "medium",
  "category": "missing_content"
}
```

#### Get User's Suggestions
```http
GET /api/suggestions/me
Authorization: Bearer <token>
```

#### Update Suggestion
```http
PUT /api/suggestions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Updated description",
  "priority": "high",
  "tags": ["tag1", "tag2"]
}
```

#### Get Suggestion Details
```http
GET /api/suggestions/:id
Authorization: Bearer <token>
```

#### Cancel Suggestion
```http
DELETE /api/suggestions/:id
Authorization: Bearer <token>
```

#### Get Form Options
```http
GET /api/suggestions/form-options
Authorization: Bearer <token>
```

### Admin Endpoints

#### Admin Dashboard
```http
GET /api/admin/suggestions
Authorization: Bearer <admin-token>

Query Parameters:
- status: pending,in_review,approved,rejected,implemented
- priority: low,medium,high,urgent
- category: missing_content,data_quality,enhancement
- type: missing_presentation,incorrect_info,etc.
- submitter: user-id
- limit: number
- page: number
```

#### Review Suggestion
```http
PUT /api/admin/suggestions/:id/review
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "action": "approve", // or "reject"
  "adminComments": "Review comments",
  "notifyUser": true,
  "estimatedImplementationTime": "3-5 business days"
}
```

#### Mark as Implemented
```http
PUT /api/admin/suggestions/:id/implement
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "implementationNotes": "Details of what was implemented",
  "implementedChanges": ["Change 1", "Change 2"],
  "notifyUser": true
}
```

## Data Model

### UserSuggestion Schema

```javascript
{
  submitter: ObjectId,           // User who submitted
  suggestionType: String,        // Type of suggestion
  targetType: String,            // What is being suggested for
  title: String,                 // Brief title
  description: String,           // Detailed description
  suggestedChanges: Object,      // Structured change data
  priority: String,              // low, medium, high, urgent
  category: String,              // missing_content, data_quality, enhancement
  status: String,                // pending, in_review, approved, rejected, implemented
  tags: [String],                // Searchable tags
  
  // Admin review fields
  reviewedBy: ObjectId,          // Admin who reviewed
  reviewedAt: Date,              // Review timestamp
  adminComments: String,         // Admin review notes
  
  // Implementation fields
  implementedBy: ObjectId,       // Admin who implemented
  implementedAt: Date,           // Implementation timestamp
  implementationNotes: String,   // Implementation details
  
  // Contact preferences
  contactPreference: String,     // email, phone, none
  allowPublicContact: Boolean,   // Allow public contact info
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

## Testing

### User Testing
Run the user test suite to test suggestion submission and management:

```bash
node test-suggestion-system.js
```

This tests:
- Form options retrieval
- Suggestion submission (various types)
- Personal suggestion retrieval
- Suggestion updates
- Detailed suggestion views

### Admin Testing
Run the admin test suite to test the review workflow:

```bash
node test-admin-suggestions.js
```

This tests:
- Admin dashboard with statistics
- Suggestion filtering and search
- Approval/rejection workflow
- Implementation tracking
- Email notifications

## Email Notifications

The system sends automatic email notifications for:

1. **Suggestion Submitted** - Confirmation to user
2. **Suggestion Reviewed** - Approval/rejection notification to user
3. **Suggestion Implemented** - Implementation confirmation to user
4. **New Suggestion** - Alert to admins (configurable)

## Workflow

1. **User Submits Suggestion**
   - User fills out suggestion form
   - System validates and stores suggestion
   - Confirmation email sent to user
   - Optional alert email sent to admins

2. **Admin Review**
   - Admin views suggestion in dashboard
   - Reviews evidence and details
   - Approves or rejects with comments
   - Email notification sent to user

3. **Implementation** (for approved suggestions)
   - Admin implements changes in system
   - Marks suggestion as implemented
   - Adds implementation notes
   - Final email sent to user

## Configuration

### Environment Variables
```env
# Email settings for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@sobie.org

# Admin notification settings
ADMIN_NOTIFICATION_EMAIL=admin@sobie.org
ENABLE_ADMIN_ALERTS=true
```

## Security

- All endpoints require authentication
- Admin endpoints require admin role
- Users can only view/edit their own suggestions
- Admins can view/manage all suggestions
- Input validation on all suggestion data
- XSS protection on user content

## Future Enhancements

1. **File Attachments** - Allow users to upload supporting documents
2. **Discussion System** - Enable comments between users and admins
3. **Voting System** - Let community vote on suggestions
4. **Batch Operations** - Admin tools for bulk actions
5. **Public Suggestions** - Allow anonymous suggestions
6. **Integration** - Direct integration with presentation database
7. **Mobile App** - Native mobile suggestion interface
8. **Analytics** - Advanced reporting and analytics

## Contributing

To contribute to the suggestion system:

1. Follow existing code patterns
2. Add appropriate error handling
3. Include input validation
4. Write comprehensive tests
5. Update documentation
6. Consider email notification impact

## Support

For issues or questions about the suggestion system, please contact the development team or submit a suggestion using the system itself!
