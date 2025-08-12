# SOBIE Conference Admin Backend API

## Overview
The admin backend provides comprehensive user management, role assignment, bulk operations, and notification capabilities for SOBIE Conference administrators and organizers.

## Authentication & Authorization
- All admin endpoints require authentication via JWT token
- Admin or organizer role required for access
- Role-based access control ensures proper permissions

## Admin Endpoints

### Dashboard & Statistics

#### GET /api/admin/dashboard/stats
Get comprehensive dashboard statistics including user counts, registration trends, and activity metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 150,
      "activeUsers": 145,
      "verifiedUsers": 140,
      "inactiveUsers": 5,
      "unverifiedUsers": 10,
      "verificationRate": "93.33"
    },
    "usersByType": {
      "student": 75,
      "academic": 50,
      "industry": 20,
      "other": 5
    },
    "usersByRole": {
      "attendee": 120,
      "presenter": 30,
      "reviewer": 15,
      "organizer": 5
    },
    "recentRegistrations": [
      {"_id": "2025-08-10", "count": 5},
      {"_id": "2025-08-11", "count": 8}
    ],
    "loginActivity": [
      {"_id": "2025-08-10", "count": 45},
      {"_id": "2025-08-11", "count": 52}
    ]
  }
}
```

### User Management

#### GET /api/admin/users
Get all users with advanced filtering, pagination, and search capabilities.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (max: 100, default: 50)
- `search` (string): Search across name, email, organization
- `userType` (string): Filter by user type (student, academic, industry, other)
- `studentLevel` (string): Filter by student level (undergraduate, graduate, doctorate)
- `organization` (string): Filter by organization
- `isActive` (boolean): Filter by active status
- `isEmailVerified` (boolean): Filter by email verification status
- `roles` (string): Comma-separated roles to filter by
- `sortBy` (string): Sort field (createdAt, email, name.lastName, etc.)
- `sortOrder` (string): Sort order (asc, desc)

**Example:**
```
GET /api/admin/users?search=john&userType=student&isActive=true&page=1&limit=25
```

#### GET /api/admin/users/:id
Get detailed information for a specific user.

#### POST /api/admin/users
Create a new user manually.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "name": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "userType": "academic",
  "affiliation": {
    "organization": "University of Example",
    "jobTitle": "Professor",
    "department": "Computer Science"
  },
  "roles": ["attendee", "reviewer"],
  "skipEmailVerification": true
}
```

#### PUT /api/admin/users/:id
Update user information.

#### DELETE /api/admin/users/:id
Delete or deactivate a user.

**Query Parameters:**
- `permanent` (boolean): If true, permanently delete user; if false, deactivate (default: false)

### Role Management

#### PUT /api/admin/users/:id/roles
Assign or remove roles from a user.

**Request Body:**
```json
{
  "roles": ["organizer", "reviewer"],
  "action": "add"  // "set", "add", or "remove"
}
```

**Valid Roles:**
- `organizer`: Conference organizers with administrative privileges
- `reviewer`: Paper/proposal reviewers
- `presenter`: Conference presenters
- `attendee`: General conference attendees
- `sponsor`: Conference sponsors
- `volunteer`: Conference volunteers

### Bulk Operations

#### PUT /api/admin/users/bulk
Update multiple users at once.

**Request Body:**
```json
{
  "userIds": ["userId1", "userId2", "userId3"],
  "updateData": {
    "isActive": true,
    "roles": ["attendee"]
  }
}
```

### Notifications

#### POST /api/admin/notifications/send
Send notifications to users or groups.

**Request Body:**
```json
{
  "recipients": "all",  // "all", "filtered", or array of user IDs
  "filters": {          // Only used when recipients = "filtered"
    "userType": "student",
    "isActive": true
  },
  "subject": "Important Conference Update",
  "message": "Dear conference participants,\n\nWe have an important update...",
  "type": "email",      // "email" or "sms"
  "priority": "normal"  // "low", "normal", "high"
}
```

**Recipients Options:**
- `"all"`: Send to all active users
- `"filtered"`: Send to users matching the filters
- `["userId1", "userId2"]`: Send to specific user IDs

### Data Export

#### GET /api/admin/users/export
Export user data in JSON or CSV format.

**Query Parameters:**
- `format` (string): Export format ("json" or "csv", default: "json")
- `filters` (object): MongoDB filters to apply

**CSV Export Example:**
```
GET /api/admin/users/export?format=csv&userType=student
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "errors": [  // For validation errors
    {
      "field": "email",
      "message": "Valid email is required",
      "value": "invalid-email"
    }
  ]
}
```

## Usage Examples

### Test Admin Access
```bash
# First, login to get your JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "barrycumbie@gmail.com",
    "password": "CatCat123!"
  }'

# Use the returned token for admin requests
export TOKEN="your-jwt-token-here"

# Test admin dashboard
curl -X GET http://localhost:3000/api/admin/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Create a User
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123!",
    "name": {
      "firstName": "Test",
      "lastName": "User"
    },
    "userType": "student",
    "studentLevel": "graduate",
    "affiliation": {
      "organization": "Test University",
      "department": "Computer Science"
    },
    "roles": ["attendee"],
    "skipEmailVerification": true
  }'
```

### Search Users
```bash
curl -X GET "http://localhost:3000/api/admin/users?search=test&userType=student&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### Send Notification
```bash
curl -X POST http://localhost:3000/api/admin/notifications/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": "filtered",
    "filters": {
      "userType": "student",
      "isActive": true
    },
    "subject": "Welcome Students!",
    "message": "Welcome to the SOBIE Conference! We are excited to have you join us.",
    "priority": "normal"
  }'
```

### Assign Roles
```bash
curl -X PUT http://localhost:3000/api/admin/users/USER_ID/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roles": ["presenter", "reviewer"],
    "action": "add"
  }'
```

## Security Features

- **Role-based access control**: Only admin/organizer roles can access admin endpoints
- **Input validation**: Comprehensive validation for all inputs
- **Rate limiting**: Same rate limits as other authenticated endpoints
- **Audit trail**: All admin actions are logged (implement logging as needed)
- **Bulk operation limits**: Bulk operations are limited to prevent abuse

## Best Practices

1. **Use filtering wisely**: When dealing with large user bases, always use appropriate filters
2. **Pagination**: Always paginate results for better performance
3. **Bulk operations**: Use bulk operations for efficiency when updating multiple users
4. **Notifications**: Test notifications with small groups before sending to all users
5. **Role assignment**: Be careful with role assignments, especially admin privileges
6. **Data export**: Use filters to export only necessary data

## Next Steps

Consider implementing:
- **Admin activity logging**: Track all admin actions for audit purposes
- **Advanced user analytics**: More detailed user behavior analytics
- **Custom notification templates**: Pre-defined email templates for common messages
- **Scheduled notifications**: Ability to schedule notifications for future sending
- **User import**: Bulk user import from CSV/Excel files
- **Advanced reporting**: Generate detailed reports on conference activities
