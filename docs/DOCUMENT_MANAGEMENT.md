# SOBIE Document Management System

## Overview
A comprehensive document management system for storing and serving conference PDFs including programs, proceedings, schedules, and other conference materials.

## Storage Architecture

### Filesystem + Database Hybrid Approach
- **PDF files**: Stored in organized directory structure on filesystem
- **Metadata**: Stored in MongoDB for fast queries and access control
- **Best of both worlds**: File performance + database features

### Directory Structure
```
uploads/documents/
├── 2024/
│   ├── program/
│   ├── proceedings/
│   ├── schedule/
│   ├── poster/
│   └── presentation/
├── 2025/
│   ├── program/
│   ├── proceedings/
│   ├── schedule/
│   ├── poster/
│   └── presentation/
└── 2026/
    └── ...
```

## Document Categories
- **program**: Conference programs and agendas
- **proceedings**: Published conference proceedings
- **schedule**: Session schedules and timetables
- **poster**: Poster session materials
- **presentation**: Presentation slides and materials
- **abstract**: Abstract collections
- **sponsor_material**: Sponsor-provided materials
- **other**: Miscellaneous documents

## Features

### 🔐 **Access Control**
- **Public documents**: Available to all users
- **Role-based access**: Documents restricted to specific roles
- **Registration requirement**: Documents requiring conference registration
- **Uploader permissions**: Original uploaders always have access

### 📊 **Document Management**
- **File integrity**: SHA-256 checksums prevent corruption
- **Duplicate detection**: Automatic detection of identical files
- **Version control**: Track document versions and history
- **Metadata-rich**: Comprehensive document information

### 🔍 **Search & Discovery**
- **Advanced filtering**: By year, category, track, public status
- **Text search**: Search titles, descriptions, and keywords
- **Pagination**: Efficient browsing of large document collections
- **Download tracking**: Monitor document access and popularity

### 📈 **Analytics & Statistics**
- **Upload statistics**: Documents by category and year
- **Download tracking**: Most popular documents
- **Storage analytics**: File sizes and storage usage
- **User engagement**: Access patterns and trends

## API Endpoints

### Public Access
- `GET /api/documents` - List documents (with access control)
- `GET /api/documents/:id` - Get document details
- `GET /api/documents/:id/download` - Download document file

### Admin/Organizer Only
- `POST /api/documents/upload` - Upload new document
- `GET /api/documents/admin/stats` - Get document statistics

### Authenticated Users
- `PUT /api/documents/:id` - Update document metadata
- `DELETE /api/documents/:id` - Delete/archive document

## Upload Process

### 1. File Upload
```bash
curl -X POST /api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@conference-program-2025.pdf" \
  -F "title=SOBIE 2025 Conference Program" \
  -F "category=program" \
  -F "conferenceYear=2025" \
  -F "isPublic=true"
```

### 2. Automatic Processing
- File saved to organized directory structure
- SHA-256 checksum calculated for integrity
- Duplicate detection performed
- Database record created with metadata

### 3. Access Control Applied
- Permission checks on all access attempts
- Role-based restrictions enforced
- Download tracking initiated

## Security Features

### File Security
- **Type validation**: Only PDF files accepted
- **Size limits**: 50MB maximum file size
- **Checksum verification**: File integrity protection
- **Safe filenames**: Sanitized filename generation

### Access Security
- **Authentication required**: Most operations require login
- **Role-based permissions**: Fine-grained access control
- **Upload restrictions**: Only admins/organizers can upload
- **Audit trail**: Track all document access and modifications

## Example Usage

### Upload Conference Program
```javascript
const formData = new FormData();
formData.append('document', file);
formData.append('title', 'SOBIE 2025 Conference Program');
formData.append('description', 'Complete program including schedules, speakers, and sessions');
formData.append('category', 'program');
formData.append('conferenceYear', '2025');
formData.append('isPublic', 'true');
formData.append('keywords', '["program", "schedule", "2025"]');

const response = await fetch('/api/documents/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### Search Documents
```javascript
const response = await fetch('/api/documents?category=program&conferenceYear=2025&search=keynote');
const data = await response.json();
```

### Download Document
```javascript
window.open(`/api/documents/${documentId}/download`);
```

## Database Schema Highlights

### Document Model
```javascript
{
  title: "Conference Program",
  category: "program",
  filename: "1234567890-conference_program_2025.pdf",
  filePath: "uploads/documents/2025/program/1234567890-conference_program_2025.pdf",
  fileSize: 2048576,
  checksum: "a1b2c3d4e5f6...",
  conferenceYear: 2025,
  isPublic: true,
  allowedRoles: ["attendee", "presenter"],
  downloadCount: 142,
  uploadedBy: ObjectId("..."),
  status: "active"
}
```

## Performance Optimizations

### Database Indexes
- Conference year + category (common queries)
- Upload user (permission checks)
- Public status + active status (public listings)
- Publish date + expiry date (scheduling)

### File Serving
- Direct filesystem access for downloads
- Proper HTTP headers for caching
- Stream-based file delivery for large files
- CDN-ready architecture

## Best Practices

### For Administrators
1. **Organize by year and category** for easy management
2. **Use descriptive titles** for better searchability
3. **Set appropriate permissions** based on content sensitivity
4. **Regular cleanup** of old or obsolete documents

### For Developers
1. **Always check permissions** before serving files
2. **Handle file errors gracefully** (missing files, corruption)
3. **Monitor storage usage** and implement cleanup policies
4. **Log document access** for security and analytics

## Backup Strategy

### File Backups
- Regular filesystem backups of `uploads/documents/` directory
- Incremental backups for efficiency
- Cloud storage synchronization for disaster recovery

### Database Backups
- Regular MongoDB backups including document metadata
- Consistent backup timing with file backups
- Restoration procedures documented and tested

## Migration from Database Storage

If you currently store PDFs in the database:

1. **Export existing documents** from database
2. **Save to filesystem** using organized directory structure
3. **Update document records** with file paths
4. **Remove binary data** from database
5. **Test access permissions** and download functionality

This hybrid approach provides the best performance, scalability, and maintainability for conference document management!
