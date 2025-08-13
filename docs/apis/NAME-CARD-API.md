# Name Card Generation API

## Overview

The Name Card Generation API allows administrators to create professional, printable name cards for conference attendees. Each name card includes:

- **Attendee Information**: Preferred name, affiliation, university
- **Visual Indicators**: Attendee type (Student, Academic, SOBIE Affiliate, Professional)
- **Conference History**: First-time attendee badge or repeat attendee count
- **Professional Design**: SOBIE branding with university logos (when available)
- **Admin Features**: Registration ID for tracking, QR code placeholder for future features

## Features

### 🎨 Professional Design
- Standard name badge size (4" × 3")
- SOBIE conference branding
- Color-coded attendee type indicators
- Clean, readable typography
- University logo integration (when available)

### 📊 Attendee Classification
- **Student** (Blue): University students and PhD candidates
- **Academic** (Green): Faculty, researchers, professors
- **SOBIE Affiliate** (Red): SOBIE organization members
- **Professional** (Purple): Industry professionals
- **Industry** (Orange): Corporate representatives

### 🏆 Conference History Tracking
- **First-time Badge**: Orange "FIRST TIME" indicator for new attendees
- **Veteran Badge**: Green "Nx SOBIE" counter for repeat attendees
- Automatic detection based on registration history

### 🖨️ Print-Ready Output
- High-quality PDF generation
- Multiple cards per page (6 cards per letter-size page)
- Professional print margins
- Consistent spacing and alignment

## API Endpoints

### Generate All Name Cards

```http
GET /api/admin/name-cards/generate?conferenceId={id}&format=pdf&includeLogos=true
```

**Description**: Generate name cards for all confirmed attendees of a conference.

**Query Parameters**:
- `conferenceId` (required): MongoDB ObjectId of the conference
- `format` (optional): Output format - `pdf` (default) or `png`
- `includeLogos` (optional): Include university logos - `true` (default) or `false`

**Response**: PDF file download

**Example**:
```bash
curl -X GET "http://localhost:3000/api/admin/name-cards/generate?conferenceId=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -o "conference-name-cards.pdf"
```

### Generate Single Name Card

```http
GET /api/admin/name-cards/attendee/{registrationId}?format=pdf&includeLogos=true
```

**Description**: Generate a name card for a specific attendee.

**Path Parameters**:
- `registrationId` (required): MongoDB ObjectId of the registration

**Query Parameters**:
- `format` (optional): Output format - `pdf` (default) or `png`
- `includeLogos` (optional): Include university logos - `true` (default) or `false`

**Response**: PDF file download

**Example**:
```bash
curl -X GET "http://localhost:3000/api/admin/name-cards/attendee/507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -o "john-doe-name-card.pdf"
```

### Get Name Card Preview

```http
GET /api/admin/name-cards/preview/{registrationId}
```

**Description**: Get preview data for a name card without generating the PDF.

**Path Parameters**:
- `registrationId` (required): MongoDB ObjectId of the registration

**Response**:
```json
{
  "success": true,
  "data": {
    "nameCard": {
      "preferredName": "Dr. Jane Smith",
      "fullName": "Jane Marie Smith",
      "affiliation": "University of Example",
      "university": "University of Example",
      "attendeeType": "academic",
      "isFirstTime": false,
      "sobieCount": 3,
      "conferenceYear": 2024,
      "email": "jane.smith@example.edu",
      "registrationId": "507f1f77bcf86cd799439012"
    },
    "attendeeHistory": {
      "totalSOBIEsAttended": 3,
      "isFirstTime": false,
      "previousConferences": [
        {
          "year": 2022,
          "title": "SOBIE 2022: Innovation in Biomedical Engineering"
        },
        {
          "year": 2023,
          "title": "SOBIE 2023: Future Technologies"
        },
        {
          "year": 2024,
          "title": "SOBIE 2024: Sustainable Solutions"
        }
      ]
    }
  }
}
```

### Get Attendees List

```http
GET /api/admin/name-cards/attendees/{conferenceId}?page=1&limit=50&search=smith
```

**Description**: Get a paginated list of attendees with name card data for bulk generation.

**Path Parameters**:
- `conferenceId` (required): MongoDB ObjectId of the conference

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `search` (optional): Search by name or affiliation

**Response**:
```json
{
  "success": true,
  "data": {
    "attendees": [
      {
        "registrationId": "507f1f77bcf86cd799439012",
        "nameCard": {
          "preferredName": "Dr. Jane Smith",
          "fullName": "Jane Marie Smith",
          "affiliation": "University of Example",
          "university": "University of Example",
          "attendeeType": "academic",
          "isFirstTime": false,
          "sobieCount": 3,
          "conferenceYear": 2024,
          "email": "jane.smith@example.edu",
          "registrationId": "507f1f77bcf86cd799439012"
        },
        "selected": false
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 5,
      "total": 247,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Authentication & Authorization

All name card endpoints require:
- **Authentication**: Valid JWT token
- **Authorization**: Admin or Super Admin role

### Headers Required:
```
Authorization: Bearer {your-jwt-token}
Content-Type: application/json
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Conference ID is required",
  "statusCode": 400
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "statusCode": 401
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Admin access required",
  "statusCode": 403
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "No confirmed registrations found for this conference",
  "statusCode": 404
}
```

## Data Models

### Attendee Data Structure
```javascript
{
  preferredName: String,      // Display name on badge
  fullName: String,           // Full legal name
  affiliation: String,        // Primary affiliation
  university: String,         // University name
  attendeeType: String,       // student|academic|sobie_affiliate|professional|industry
  isFirstTime: Boolean,       // First SOBIE conference
  sobieCount: Number,         // Total SOBIEs attended
  conferenceYear: Number,     // Current conference year
  email: String,              // Contact email
  registrationId: ObjectId    // Registration reference
}
```

### Attendee Types
- `student`: University students, graduate students, PhD candidates
- `academic`: Faculty, professors, researchers, postdocs
- `sobie_affiliate`: SOBIE organization members and staff
- `professional`: Independent professionals, consultants
- `industry`: Corporate representatives, industry professionals

## Technical Implementation

### PDF Generation
- **Library**: PDFKit for professional PDF generation
- **Layout**: 6 name cards per letter-size page (2 columns × 3 rows)
- **Dimensions**: 4" × 3" per card (standard name badge size)
- **Fonts**: Helvetica family for cross-platform compatibility
- **Colors**: SOBIE brand colors with accessibility considerations

### Image Processing
- **Library**: Sharp for logo processing
- **Logo Sources**: Clearbit Logo API, university domain detection
- **Processing**: Automatic resize, format conversion, background removal
- **Caching**: In-memory logo cache for performance

### Performance Considerations
- **Bulk Generation**: Efficient PDF streaming for large batches
- **Memory Management**: Chunked processing for large attendee lists
- **Caching**: Logo caching to reduce external API calls
- **Error Handling**: Graceful fallbacks for missing data/logos

## Usage Examples

### Frontend Integration (React)

```javascript
// Generate all name cards for a conference
const generateAllNameCards = async (conferenceId) => {
  try {
    const response = await fetch(
      `/api/admin/name-cards/generate?conferenceId=${conferenceId}&includeLogos=true`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conference-${conferenceId}-name-cards.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error generating name cards:', error);
  }
};

// Get attendees list for selection
const getAttendeesList = async (conferenceId, page = 1, search = '') => {
  try {
    const response = await fetch(
      `/api/admin/name-cards/attendees/${conferenceId}?page=${page}&search=${encodeURIComponent(search)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching attendees:', error);
  }
};
```

### Command Line Usage

```bash
# Generate all name cards for a conference
curl -X GET "http://localhost:3000/api/admin/name-cards/generate?conferenceId=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "conference-name-cards.pdf"

# Generate single name card
curl -X GET "http://localhost:3000/api/admin/name-cards/attendee/507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "attendee-name-card.pdf"

# Get preview data
curl -X GET "http://localhost:3000/api/admin/name-cards/preview/507f1f77bcf86cd799439012" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Future Enhancements

### Planned Features
- **QR Code Integration**: Dynamic QR codes for digital check-in
- **Template Customization**: Multiple name card templates
- **Batch Selection**: UI for selecting specific attendees
- **Print Optimization**: Print settings and paper size options
- **Logo Management**: Admin interface for university logo uploads
- **Export Formats**: PNG, SVG, and vector format support

### Integration Opportunities
- **Check-in System**: QR code scanning for event entry
- **Digital Badges**: Web-based digital name badges
- **Networking**: QR codes for contact information exchange
- **Analytics**: Track name card generation and usage

## Troubleshooting

### Common Issues

1. **Missing Dependencies**
   ```bash
   npm install pdfkit sharp axios
   ```

2. **Memory Issues with Large Batches**
   - Process in smaller chunks
   - Increase Node.js memory limit: `node --max-old-space-size=4096`

3. **University Logo Loading Failures**
   - Logos gracefully degrade to text-only
   - Check network connectivity for external logo APIs
   - Consider maintaining local logo database

4. **PDF Generation Errors**
   - Ensure sufficient disk space for temporary files
   - Check write permissions in output directory
   - Validate attendee data completeness

### Support
For technical support or feature requests, please contact the SOBIE development team or create an issue in the project repository.
