# SOBIE Program Parser API

## Overview
The SOBIE Program Parser API provides comprehensive PDF parsing and historical data extraction capabilities for SOBIE conference programs. This system can extract attendee information, presentations, sessions, committees, sponsors, and other conference data from PDF program documents and populate the database with historical records.

## Features
- **PDF Content Extraction**: Parse PDF program documents to extract text content
- **Attendee Data Mining**: Identify and extract attendee names, affiliations, and contact information
- **Presentation Cataloging**: Extract presentation titles, authors, abstracts, and session information
- **Session Management**: Identify conference sessions, workshops, keynotes, and special events
- **Committee Recognition**: Extract organizing committee, program committee, and advisory board information
- **Sponsor Identification**: Parse sponsor and acknowledgment sections
- **Schedule Extraction**: Extract conference schedule and timing information
- **Venue Documentation**: Capture venue and room information
- **Database Integration**: Automatically create user profiles, registrations, and research records
- **Historical Tracking**: Maintain extraction metadata and processing history

## Authentication
All endpoints require admin or organizer role authentication.

```javascript
Headers: {
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
}
```

## API Endpoints

### 1. Parse Program PDF
**POST** `/api/admin/parse-program`

Parse a SOBIE program PDF and extract all available data.

#### Request Body
```json
{
  "filePath": "/path/to/sobie-2023-program.pdf",
  "year": 2023
}
```

#### Response
```json
{
  "success": true,
  "message": "Program PDF parsed and data extracted successfully",
  "data": {
    "extractedData": {
      "conference": {
        "year": 2023,
        "title": "SOBIE 2023",
        "name": "SOBIE 2023",
        "dates": ["March 15-17, 2023"],
        "location": "Sandestin Golf and Beach Resort, Miramar Beach, FL",
        "venue": "Sandestin Golf and Beach Resort",
        "city": "Miramar Beach",
        "state": "Florida",
        "country": "USA"
      },
      "attendeesCount": 145,
      "presentationsCount": 67,
      "sessionsCount": 12,
      "committeesCount": 4,
      "sponsorsCount": 8,
      "scheduleCount": 23
    },
    "savedData": {
      "conferenceId": "64f8b3c9e1234567890abcde",
      "usersCreated": 145,
      "registrationsCreated": 145,
      "researchCreated": 67
    },
    "summary": {
      "filePath": "/path/to/sobie-2023-program.pdf",
      "processingTimestamp": "2024-01-15T10:30:00.000Z",
      "totalDataPoints": 224,
      "databaseRecordsCreated": 357
    }
  }
}
```

### 2. Get Available Programs
**GET** `/api/admin/available-programs`

Retrieve a list of available program PDFs that can be parsed.

#### Response
```json
{
  "success": true,
  "message": "Available program PDFs retrieved",
  "data": {
    "programs": [
      {
        "filename": "sobie-2023-program.pdf",
        "path": "/uploads/documents/2019/program/sobie-2023-program.pdf",
        "size": 2457600,
        "year": 2023,
        "lastModified": "2024-01-10T14:20:00.000Z",
        "directory": "/uploads/documents/2019/program"
      },
      {
        "filename": "sobie-2022-proceedings.pdf",
        "path": "/uploads/documents/2022/sobie-2022-proceedings.pdf",
        "size": 3845120,
        "year": 2022,
        "lastModified": "2023-12-15T09:15:00.000Z",
        "directory": "/uploads/documents/2022"
      }
    ],
    "totalFound": 2,
    "scannedPaths": [
      "/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents",
      "/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads",
      "/Users/bcumbie/Desktop/sobie-dev/sobieNode/public/uploads"
    ]
  }
}
```

### 3. Parse Specific Program
**POST** `/api/admin/parse-program/:programId`

Parse a specific program by ID or path.

#### Parameters
- `programId`: Program identifier or file path

#### Request Body
```json
{
  "filePath": "/optional/override/path/to/program.pdf"
}
```

#### Response
Same format as Parse Program PDF endpoint.

### 4. Get Parsing History
**GET** `/api/admin/parsing-history`

Retrieve parsing history and statistics for all processed programs.

#### Response
```json
{
  "success": true,
  "message": "Parsing history retrieved",
  "data": {
    "history": [
      {
        "conference": {
          "id": "64f8b3c9e1234567890abcde",
          "title": "SOBIE 2023",
          "year": 2023,
          "location": {
            "venue": "Sandestin Golf and Beach Resort",
            "city": "Miramar Beach",
            "state": "Florida",
            "country": "USA"
          }
        },
        "statistics": {
          "usersExtracted": 145,
          "registrationsCreated": 145,
          "researchCreated": 67,
          "totalDataPoints": 357
        },
        "extractedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "totalConferences": 1,
    "summary": {
      "totalUsers": 145,
      "totalRegistrations": 145,
      "totalResearch": 67
    }
  }
}
```

## Data Extraction Capabilities

### Conference Information
- Conference year, title, and name
- Conference dates and duration
- Venue and location details
- Host organization information

### Attendee Data
- **Name Extraction**: First name, last name, full name
- **Affiliation Parsing**: University, company, or organization
- **Contact Information**: When available in the document
- **Role Identification**: Presenter, author, committee member status

### Presentation Cataloging
- **Title Extraction**: Presentation and paper titles
- **Author Lists**: Primary and co-authors
- **Abstract Content**: When included in the program
- **Session Assignment**: Which session the presentation belongs to
- **Presentation Type**: Oral, poster, keynote, workshop classification

### Session Management
- **Session Names**: Extract session titles and themes
- **Time Slots**: Session timing and duration
- **Room Assignments**: Venue and room information
- **Session Types**: Keynote, plenary, workshop, tutorial identification

### Committee and Organization
- **Organizing Committee**: Conference organizers and chairs
- **Program Committee**: Review committee members
- **Advisory Board**: Advisory and steering committee
- **Special Roles**: Conference chairs, session chairs, moderators

### Sponsor Recognition
- **Sponsor Lists**: Corporate and institutional sponsors
- **Acknowledgments**: Funding and support acknowledgments
- **Partner Organizations**: Collaborating institutions

### Schedule Information
- **Event Timeline**: Conference schedule with times
- **Special Events**: Social events, meals, networking
- **Breaks and Intervals**: Coffee breaks, lunch periods
- **Location Mapping**: Room and venue assignments

## Database Integration

### User Profile Creation
```javascript
{
  name: { first: "John", last: "Smith" },
  email: "john.smith@extracted.sobie.org",
  profile: {
    affiliation: "University of Example",
    extractedFrom: "sobie2023program",
    isExtractedData: true
  },
  role: "user",
  isEmailVerified: false
}
```

### Conference Registration
```javascript
{
  userId: ObjectId,
  conferenceId: ObjectId,
  status: "confirmed",
  registrationInfo: {
    personalInfo: {
      fullName: "John Smith",
      email: "john.smith@extracted.sobie.org",
      affiliation: "University of Example"
    }
  },
  extractedFrom: "sobie2023program",
  confirmation: {
    confirmed: true,
    confirmedAt: Date
  }
}
```

### Research Records
```javascript
{
  title: "Presentation Title",
  type: "presentation",
  conference: {
    year: 2023,
    conferenceId: ObjectId
  },
  status: "accepted",
  extractedFrom: "sobie2023program",
  submittedAt: Date,
  acceptedAt: Date
}
```

## Error Handling

### Common Error Responses

#### File Not Found
```json
{
  "success": false,
  "message": "PDF file not found",
  "filePath": "/path/to/missing/file.pdf"
}
```

#### Invalid File Format
```json
{
  "success": false,
  "message": "Invalid file format. Only PDF files are supported"
}
```

#### Parsing Error
```json
{
  "success": false,
  "message": "Error parsing program PDF",
  "error": "Detailed error message"
}
```

#### Authentication Error
```json
{
  "success": false,
  "message": "Access denied. Admin role required"
}
```

## Usage Examples

### Parse SOBIE 2023 Program
```bash
curl -X POST http://localhost:3000/api/admin/parse-program \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents/2019/program/sobie-2023-program.pdf",
    "year": 2023
  }'
```

### Get Available Programs
```bash
curl -X GET http://localhost:3000/api/admin/available-programs \
  -H "Authorization: Bearer <admin_token>"
```

### Get Parsing History
```bash
curl -X GET http://localhost:3000/api/admin/parsing-history \
  -H "Authorization: Bearer <admin_token>"
```

## Best Practices

### 1. File Management
- Store PDF files in organized directory structure
- Use consistent naming conventions (e.g., `sobie-YYYY-program.pdf`)
- Maintain backup copies of original documents

### 2. Data Validation
- Review extracted data before final database commit
- Validate attendee information for accuracy
- Cross-reference with existing user records

### 3. Processing Guidelines
- Parse programs in chronological order when possible
- Monitor extraction statistics for quality assessment
- Regular backup of parsed data

### 4. Performance Optimization
- Process large PDFs during off-peak hours
- Monitor memory usage during parsing
- Implement progress tracking for long operations

## Technical Notes

### PDF Text Extraction
The system uses `pdf-parse` library for text extraction with support for:
- Multi-page documents
- Various PDF formats and encodings
- Text layout preservation where possible

### Pattern Recognition
Advanced regex patterns for:
- Name and affiliation parsing
- Academic title recognition
- Institution and organization identification
- Time and date extraction

### Data Deduplication
- Automatic duplicate detection and removal
- Cross-referencing with existing database records
- Smart merging of similar entries

### Logging and Monitoring
- Comprehensive logging of all extraction operations
- Performance metrics and statistics
- Error tracking and debugging information

## Support

For technical support or feature requests related to the Program Parser API, please contact the development team or submit an issue through the appropriate channels.
