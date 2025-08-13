# SOBIE 2023 Program Parser - Updated Commands

## PDF Location Update
The SOBIE 2023 program PDF has been moved to the correct location:
**New Path**: `/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents/2023/program/sobie-2023-program.pdf`

## Updated API Commands

### 1. Parse SOBIE 2023 Program (Updated Path)
```bash
curl -X POST "http://localhost:3000/api/admin/parse-program" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents/2023/program/sobie-2023-program.pdf",
    "year": 2023
  }'
```

### 2. Get Available Programs (Should now find the PDF in correct location)
```bash
curl -X GET "http://localhost:3000/api/admin/available-programs" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

### 3. Parse Specific Program by Path
```bash
curl -X POST "http://localhost:3000/api/admin/parse-program/2023" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents/2023/program/sobie-2023-program.pdf"
  }'
```

### 4. Get Parsing History
```bash
curl -X GET "http://localhost:3000/api/admin/parsing-history" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

## Authentication Required

All endpoints require admin authentication. To get an admin token:

### Option 1: Create Admin User
```bash
curl -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": {
      "first": "Admin",
      "last": "User"
    },
    "email": "admin@sobie.org",
    "password": "AdminPassword123!",
    "role": "admin"
  }'
```

### Option 2: Login with Existing Admin
```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sobie.org",
    "password": "AdminPassword123!"
  }'
```

## Expected Results

When successfully parsed, the API will:

1. **Extract Conference Data**: SOBIE 2023 conference information
2. **Create User Profiles**: For all attendees found in the PDF
3. **Generate Registrations**: Link attendees to the conference
4. **Catalog Research**: Extract presentation and research information
5. **Build Historical Records**: Populate the database with historical data

## File Structure Verification

The parser will scan these directories for PDFs:
- `/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads/documents` ✅
- `/Users/bcumbie/Desktop/sobie-dev/sobieNode/uploads`
- `/Users/bcumbie/Desktop/sobie-dev/sobieNode/public/uploads`

The SOBIE 2023 program is now correctly located in:
📄 `/uploads/documents/2023/program/sobie-2023-program.pdf`

## Next Steps

1. **Start Server**: Ensure the server is running on port 3000
2. **Authenticate**: Get an admin token
3. **Parse PDF**: Use the updated file path in the API call
4. **Review Results**: Check the extracted data and database records

The program parser will automatically:
- Extract attendee names and affiliations
- Identify presentations and abstracts
- Parse session information
- Create user profiles for historical tracking
- Generate conference registration records
- Catalog research submissions

This will populate the SOBIE historical database with comprehensive data from the 2023 conference program.
