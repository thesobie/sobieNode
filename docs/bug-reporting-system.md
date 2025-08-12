# Bug Reporting System with GitHub Integration

## Overview

The SOBIE Conference Bug Reporting System provides a comprehensive solution for users to report bugs in the application, which automatically creates GitHub issues in the [sobieNode repository](https://github.com/thesobie/sobieNode/issues). This system integrates with the existing communication system to notify administrators and keep users informed about bug resolution progress.

## Features

### 🐛 **Bug Reporting**
- **Detailed Bug Reports**: Title, description, category, severity
- **Reproduction Steps**: Step-by-step reproduction instructions
- **Environment Tracking**: Browser, OS, screen resolution, URL
- **Expected vs Actual Behavior**: Clear distinction of what went wrong
- **File Attachments**: Screenshots, logs, and other supporting files
- **Context Linking**: Associate bugs with conferences, sessions, or submissions

### 🔗 **GitHub Integration**
- **Automatic Issue Creation**: Creates GitHub issues at https://github.com/thesobie/sobieNode/issues
- **Rich Issue Content**: Formatted issue body with all bug details
- **Smart Labeling**: Automatic labels based on category, severity, and environment
- **Duplicate Detection**: Searches for similar existing issues
- **Status Synchronization**: Updates GitHub issues when bug status changes
- **Issue Closure**: Automatically closes GitHub issues when bugs are resolved

### 📊 **Admin Dashboard**
- **Bug Triage**: Review and categorize incoming bugs
- **Assignment System**: Assign bugs to team members
- **Status Tracking**: Track bugs through lifecycle (submitted → resolved)
- **Statistics & Analytics**: Bug trends, resolution times, category breakdown
- **GitHub Sync Status**: Monitor GitHub integration health

### 🔔 **Communication Integration**
- **Admin Notifications**: Instant notifications when bugs are reported
- **User Updates**: Automatic status change notifications
- **In-app Messaging**: Communication through existing message system
- **Email Notifications**: Optional email alerts for critical bugs

## API Endpoints

### User Endpoints

#### Submit Bug Report
```http
POST /api/bug-reports
```

**Request Body:**
```json
{
  "title": "Login button not working on mobile",
  "description": "When I tap the login button on my phone, nothing happens. The page doesn't respond.",
  "category": "mobile",
  "severity": "medium",
  "priority": "normal",
  "stepsToReproduce": [
    "Open the app on mobile browser",
    "Navigate to login page", 
    "Enter credentials",
    "Tap login button"
  ],
  "expectedBehavior": "Should log in and redirect to dashboard",
  "actualBehavior": "Button doesn't respond to taps",
  "additionalContext": "Issue only occurs on mobile devices",
  "environment": {
    "browser": "Safari",
    "browserVersion": "17.0",
    "operatingSystem": "iOS 17.1",
    "screenResolution": "390x844",
    "url": "https://sobie.example.com/login"
  },
  "userCanContact": true,
  "contactPreference": "in_app",
  "createGithubIssue": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bug report submitted successfully",
  "data": {
    "bugReport": {
      "id": "65f8b12c45d6e7f8a9b0c1d2",
      "title": "Login button not working on mobile",
      "category": "mobile",
      "severity": "medium",
      "status": "submitted",
      "githubIssue": {
        "issueNumber": 42,
        "issueUrl": "https://github.com/thesobie/sobieNode/issues/42",
        "status": "created"
      },
      "createdAt": "2024-03-15T10:30:00Z"
    }
  }
}
```

#### Get My Bug Reports
```http
GET /api/bug-reports/my-reports?status=submitted&page=1&limit=10
```

#### Get Bug Report Details
```http
GET /api/bug-reports/{reportId}
```

### Admin Endpoints

#### Get All Bug Reports
```http
GET /api/bug-reports/admin/all?status=submitted&severity=high&page=1
```

#### Update Bug Status
```http
PUT /api/bug-reports/{reportId}/status
```

**Request Body:**
```json
{
  "status": "resolved",
  "resolution": "Fixed in version 1.2.0 - login button touch events now properly handled on mobile devices",
  "assignedTo": "dev_user_id"
}
```

#### Get Bug Statistics
```http
GET /api/bug-reports/admin/statistics?timeframe=30d
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "totalBugs": 15,
      "byStatus": {
        "submitted": 5,
        "in_progress": 7,
        "resolved": 3
      },
      "byCategory": {
        "functionality": 8,
        "ui_ux": 4,
        "mobile": 3
      },
      "bySeverity": {
        "low": 2,
        "medium": 10,
        "high": 3
      },
      "avgTimeToResolve": 48.5
    }
  }
}
```

#### Check GitHub Status
```http
GET /api/bug-reports/admin/github-status
```

### Utility Endpoints

#### Get Bug Categories
```http
GET /api/bug-reports/categories
```

#### Get Severity Levels
```http
GET /api/bug-reports/severity-levels
```

#### Get Bug Report Template
```http
GET /api/bug-reports/template
```

## GitHub Integration Setup

### Environment Variables

Add to your `.env` file:

```bash
# GitHub Integration
GITHUB_TOKEN=your_personal_access_token_here
```

### GitHub Token Requirements

The GitHub token needs the following permissions:
- **Repository access**: Read/Write access to thesobie/sobieNode
- **Issues**: Create, read, update issues
- **Pull requests**: Read access (for comprehensive API usage)

### Generating GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `write:discussion` (Write access to discussions)
4. Copy the token and add to your `.env` file

### Label Management

The system automatically creates these labels in your repository:

**Category Labels:**
- `category:ui_ux` - User interface issues
- `category:functionality` - Feature problems
- `category:performance` - Speed/loading issues
- `category:data` - Data consistency issues
- `category:security` - Security vulnerabilities
- `category:mobile` - Mobile-specific issues
- `category:integration` - Third-party integration issues
- `category:other` - Uncategorized issues

**Severity Labels:**
- `severity:low` - Minor issues
- `severity:medium` - Moderate issues
- `severity:high` - Significant issues
- `severity:critical` - Severe/blocking issues

**Priority Labels:**
- `priority:high` - High priority items
- `priority:urgent` - Urgent items

**System Labels:**
- `bug` - Bug reports
- `user-reported` - Reported by application users

## Bug Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **UI/UX** | User interface or experience issues | Layout problems, confusing navigation, styling issues |
| **Functionality** | Features not working as expected | Buttons not working, forms not submitting, broken workflows |
| **Performance** | Speed, loading, or responsiveness issues | Slow page loads, timeouts, memory issues |
| **Data** | Data inconsistency or corruption | Missing data, incorrect calculations, sync issues |
| **Security** | Security vulnerabilities or concerns | Authentication bypasses, data exposure, XSS vulnerabilities |
| **Mobile** | Mobile-specific issues | Touch problems, responsive design issues, mobile browser bugs |
| **Integration** | Third-party service problems | API failures, payment processing issues, email delivery problems |
| **Other** | Issues that don't fit other categories | Configuration problems, deployment issues |

## Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **Low** | Minor issue, workaround available | 7-14 days | Cosmetic issues, minor typos |
| **Medium** | Affects functionality but not blocking | 3-7 days | Form validation errors, broken links |
| **High** | Significant impact on user experience | 1-3 days | Login issues, data not saving |
| **Critical** | Blocks core functionality or security risk | Same day | App crashes, security vulnerabilities |

## Workflow

### 1. User Reports Bug

```javascript
// Frontend code example
const reportBug = async (bugData) => {
  const response = await fetch('/api/bug-reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      title: bugData.title,
      description: bugData.description,
      category: bugData.category,
      severity: bugData.severity,
      stepsToReproduce: bugData.steps,
      environment: {
        browser: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        url: window.location.href
      }
    })
  });
  
  const result = await response.json();
  if (result.success) {
    showNotification('Bug report submitted! GitHub issue #' + result.data.bugReport.githubIssue.issueNumber);
  }
};
```

### 2. System Processing

1. **Validation**: Input validation and sanitization
2. **GitHub Issue Creation**: Automatic issue creation with formatted content
3. **Notification**: Admins notified via communication system
4. **Confirmation**: User receives confirmation with GitHub link

### 3. Admin Workflow

```javascript
// Admin dashboard example
const updateBugStatus = async (bugId, newStatus, resolution) => {
  const response = await fetch(`/api/bug-reports/${bugId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: newStatus,
      resolution: resolution
    })
  });
  
  // This automatically:
  // - Updates bug in database
  // - Syncs status to GitHub issue
  // - Notifies user of status change
  // - Closes GitHub issue if resolved
};
```

### 4. GitHub Issue Example

When a bug report is submitted, it creates a GitHub issue like this:

```markdown
## Bug Report

**Reported by:** John Doe (john.doe@example.com)
**Category:** MOBILE
**Severity:** MEDIUM
**Priority:** NORMAL

## Description
Login button not working on mobile devices. When I tap the login button on my phone, nothing happens.

## Steps to Reproduce
1. Open the app on mobile browser
2. Navigate to login page
3. Enter credentials
4. Tap login button

## Expected Behavior
Should log in and redirect to dashboard

## Actual Behavior
Button doesn't respond to taps

## Environment
- **Browser:** Safari 17.0
- **OS:** iOS 17.1
- **Screen Resolution:** 390x844
- **URL:** https://sobie.example.com/login
- **Timestamp:** 2024-03-15T10:30:00Z

---
**Internal ID:** 65f8b12c45d6e7f8a9b0c1d2
**Contact User:** Yes
**Contact Preference:** in_app
```

**Labels:** `bug`, `user-reported`, `category:mobile`, `severity:medium`, `browser:safari`, `os:ios`

## Database Schema

### BugReport Model

```javascript
{
  // Basic information
  reporterId: ObjectId,          // User who reported
  title: String,                 // Bug title
  description: String,           // Detailed description
  category: String,              // Bug category
  severity: String,              // Severity level
  priority: String,              // Priority level
  
  // Reproduction details
  stepsToReproduce: [{
    step: Number,
    description: String
  }],
  expectedBehavior: String,
  actualBehavior: String,
  additionalContext: String,
  
  // Environment information
  environment: {
    browser: String,
    browserVersion: String,
    operatingSystem: String,
    screenResolution: String,
    userAgent: String,
    url: String,
    timestamp: Date
  },
  
  // GitHub integration
  githubIssue: {
    issueNumber: Number,
    issueUrl: String,
    createdAt: Date,
    status: String              // 'pending', 'created', 'failed'
  },
  
  // Status tracking
  status: String,               // Workflow status
  assignedTo: ObjectId,         // Assigned developer
  resolution: String,           // Resolution description
  resolvedAt: Date,
  resolvedBy: ObjectId,
  timeToResolve: Number,        // Hours to resolve
  
  // Contact preferences
  userCanContact: Boolean,
  contactPreference: String,    // 'email', 'in_app', 'none'
  
  // Relations
  relatedConference: ObjectId,
  relatedSession: ObjectId,
  relatedSubmission: ObjectId,
  
  // Metadata
  createdAt: Date,
  updatedAt: Date
}
```

## Testing

### Run Bug Report Tests

```bash
node src/tests/bugReportTests.js
```

### Test GitHub Integration

```bash
# Set your GitHub token
export GITHUB_TOKEN="your_token_here"

# Run the tests
node src/tests/bugReportTests.js
```

### Manual Testing

1. **Submit a bug report** via POST `/api/bug-reports`
2. **Check GitHub** - verify issue was created at https://github.com/thesobie/sobieNode/issues
3. **Update status** via PUT `/api/bug-reports/{id}/status`
4. **Verify GitHub sync** - check that issue was updated/closed

## Security Considerations

- **Authentication Required**: All endpoints require valid user authentication
- **Input Validation**: Comprehensive validation of all bug report fields
- **Rate Limiting**: Prevent spam bug reports from single users
- **Sanitization**: HTML sanitization for user input to prevent XSS
- **GitHub Token Security**: Token stored securely in environment variables
- **Access Control**: Admin-only access to sensitive bug management operations

## Performance Optimization

- **Pagination**: Large bug lists are paginated for performance
- **Indexing**: Database indexes on frequently queried fields
- **Background Processing**: GitHub API calls processed asynchronously
- **Caching**: Bug statistics cached for dashboard performance
- **Search Optimization**: Full-text search indexes for bug content

## Integration with Existing Systems

### Communication System
- Automatic notifications to admins when bugs are reported
- Status update messages sent to users
- Integration with existing message and notification models

### User Management
- Links bug reports to user accounts
- Respects user contact preferences
- Role-based access for bug management

### Conference System
- Can link bugs to specific conferences, sessions, or submissions
- Conference-specific bug filtering and reporting

## Monitoring and Analytics

### Bug Metrics
- **Volume**: Number of bugs reported over time
- **Categories**: Most common bug types
- **Severity Distribution**: Critical vs non-critical bugs
- **Resolution Time**: Average time to resolve bugs
- **User Satisfaction**: Follow-up on resolved bugs

### GitHub Integration Health
- **API Rate Limits**: Monitor GitHub API usage
- **Failed Creations**: Track failed issue creation attempts
- **Sync Status**: Monitor GitHub synchronization health

## Future Enhancements

- **Duplicate Detection**: AI-powered duplicate bug detection
- **Auto-Assignment**: Automatic bug assignment based on category/expertise
- **User Feedback**: Post-resolution feedback collection
- **Bug Trends**: Advanced analytics and trend prediction
- **Integration Testing**: Automated testing of GitHub integration
- **Webhook Support**: GitHub webhooks for bi-directional sync
- **Mobile App**: Dedicated mobile app for bug reporting
- **Screenshot Integration**: Built-in screenshot capture and upload

## Troubleshooting

### Common Issues

**GitHub token not working:**
- Verify token has correct permissions
- Check token hasn't expired
- Ensure repository access is granted

**Issues not being created:**
- Check GitHub API rate limits
- Verify repository exists and is accessible
- Review token permissions

**Labels not appearing:**
- Run label creation endpoint: `GET /api/bug-reports/admin/github-status`
- Manually create labels in GitHub repository
- Check token has write access to repository

### Debug Commands

```bash
# Test GitHub connection
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
     https://api.github.com/repos/thesobie/sobieNode

# Check repository permissions
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
     https://api.github.com/repos/thesobie/sobieNode/issues

# Test label creation
curl -X POST \
     -H "Authorization: Bearer $GITHUB_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"test-label","color":"ff0000"}' \
     https://api.github.com/repos/thesobie/sobieNode/labels
```

This comprehensive bug reporting system provides a seamless way for users to report issues while automatically creating GitHub issues for development tracking, ensuring no bugs fall through the cracks!
