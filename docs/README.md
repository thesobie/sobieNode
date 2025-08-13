---
layout: default
title: Documentation Portal
nav_order: 2
description: "Comprehensive guides, API references, and technical specifications"
---

# 📚 SOBIE Conference API Documentation
{: .fs-8 }

**Comprehensive guides, API references, and technical specifications for the SOBIE Conference management system backend**
{: .fs-6 .fw-300 }

> 📁 **Project Organization**: For information about the project structure and file organization, see [**Directory Organization**](./DIRECTORY_ORGANIZATION.md)
{: .highlight }

---

## 🗂️ **Documentation Navigation**

### � **System Status & Reports**
| Document | Description | Type |
|----------|-------------|------|
| [**Project Status Final**](./PROJECT_STATUS_FINAL.md) | Complete project implementation status | 📊 Final Report |
| [**Backend Assessment**](./BACKEND-ASSESSMENT.md) | Complete technical overview and system status | 📊 System Overview |
| [**Housekeeping Report**](./HOUSEKEEPING-REPORT.md) | Development progress and modernization summary | 📋 Development Report |
| [**Directory Organization**](./DIRECTORY_ORGANIZATION.md) | Project structure and file organization | 📁 Organization Guide |

---

### 🏗️ **System Architecture**
| Document | Description | Type |
|----------|-------------|------|
| [**Dual Role System**](./DUAL_ROLE_SYSTEM.md) | App roles vs SOBIE community roles | 🎯 Role Management |
| [**Memorial System**](./MEMORIAL_SYSTEM.md) | In memoriam user management | 🕊️ Memorial Features |
| [**Profile Dashboard Integration**](./PROFILE_DASHBOARD_INTEGRATION.md) | User profile and conference history | 👤 Profile System |
| [**Duplicate Merge Success Report**](./DUPLICATE_MERGE_SUCCESS_REPORT.md) | User deduplication results | 🔀 Data Quality |

---

### 🔐 **Authentication & Security**

#### Core Authentication
| Document | Description | Access Level |
|----------|-------------|--------------|
| [**Authentication API**](./AUTHENTICATION_API.md) | Authentication endpoints and methods | 🔓 Public |
| [**Authentication Results**](./AUTHENTICATION_RESULTS.md) | Authentication response formats | 🔓 Public |

#### Advanced Authentication
| Document | Description | Access Level |
|----------|-------------|--------------|
| [**Authentication API (Detailed)**](./authentication/AUTHENTICATION_API.md) | In-depth authentication guide | 🔐 Developer |
| [**Authentication Results (Detailed)**](./authentication/AUTHENTICATION_RESULTS.md) | Comprehensive response documentation | 🔐 Developer |
| [**Authentication Status**](./authentication/AUTHENTICATION_STATUS.md) | System status and health checks | 🔐 Developer |

---

### 👥 **Administration & Management**

| Document | Description | Access Level |
|----------|-------------|--------------|
| [**Admin API**](./ADMIN_API.md) | Administrative endpoints and operations | 🔒 Admin Only |
| [**Name Card API**](./apis/NAME-CARD-API.md) | Conference name card generation system | 🔒 Admin Only |
| [**Venue API**](./apis/VENUE-API.md) | San Destin resort booking and accommodation | 🔐 Authenticated |
| [**Content Moderation**](./CONTENT_MODERATION.md) | Content safety and moderation system | 🔒 Admin/Moderator |

---

### 🔬 **Research & Academic Features**

| Document | Description | Access Level |
|----------|-------------|--------------|
| [**Research Database**](./RESEARCH_DATABASE.md) | Research paper management system | 🔐 Authenticated |
| [**Research Database Documentation**](./RESEARCH_DATABASE_DOCUMENTATION.md) | Detailed database schema and operations | 🔐 Developer |

---

### 💬 **Communication & Community**

| Document | Description | Access Level |
|----------|-------------|--------------|
| [**Communication System**](./communication-system.md) | Messaging and notification system | 🔐 Authenticated |
| [**Bug Reporting System**](./bug-reporting-system.md) | GitHub-integrated bug tracking | 🔓 Public |

---

### 📄 **Document & File Management**

| Document | Description | Access Level |
|----------|-------------|--------------|
| [**Document Management**](./DOCUMENT_MANAGEMENT.md) | File upload and document handling | 🔐 Authenticated |

---

### 🎨 **Frontend Integration Guides**

#### JavaScript Integration Examples
| File | Description | Framework |
|------|-------------|-----------|
| [**Account Recovery Frontend**](./account-recovery-frontend.js) | Account recovery UI integration | 🌐 Vanilla JS |
| [**Photo Upload Frontend**](./photo-upload-frontend.js) | Photo upload component | 🌐 Vanilla JS |

#### Framework-Specific Guides
| Directory | Description | Frameworks |
|-----------|-------------|------------|
| [**Frontend Guides**](./frontend-guides/) | Framework-specific integration examples | ⚛️ React, 🔷 Vue, 🅰️ Angular |

---

## 🔗 **Quick Links**

### 🚀 **For Developers**
- **API Base URL**: `http://localhost:3000/api`
- **Health Check**: `http://localhost:3000/health`
- **API Discovery**: `http://localhost:3000/api`

### 📋 **Common Endpoints**
```bash
# Authentication
POST /api/auth/login
POST /api/auth/register
POST /api/auth/magic-link

# User Management
GET  /api/users
GET  /api/profiles/:id
PUT  /api/profiles/me

# Research
GET  /api/research
POST /api/research-submission
GET  /api/research-submission/my

# Conference
GET  /api/conference
POST /api/conference/register
GET  /api/conference/registration

# Community
GET  /api/community
POST /api/community/interest
GET  /api/community/my-interests
```

---

## 📱 **Integration Examples**

### Frontend Frameworks

#### React Integration
```javascript
// Example API call with React
const fetchUserProfile = async () => {
  const response = await fetch('/api/profiles/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};
```

#### Vue.js Integration
```javascript
// Example API call with Vue.js
export default {
  async mounted() {
    try {
      const response = await this.$http.get('/api/research');
      this.papers = response.data;
    } catch (error) {
      console.error('Failed to fetch papers:', error);
    }
  }
}
```

#### Angular Integration
```typescript
// Example service with Angular
@Injectable()
export class ApiService {
  constructor(private http: HttpClient) {}
  
  getConferenceInfo() {
    return this.http.get('/api/conference');
  }
}
```

---

## 🛠️ **Development Tools**

### Environment Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Validate environment
npm run validate:env

# Start production server
npm start
```

### Testing Endpoints
```bash
# Health check
curl http://localhost:3000/health

# API discovery
curl http://localhost:3000/api

# Authentication test
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## 📊 **System Status**

### Current Status
- **Server**: ✅ Running on http://localhost:3000
- **Database**: ✅ MongoDB Atlas Connected
- **Authentication**: ✅ JWT Configured
- **Email Service**: ✅ SMTP Configured (Development)
- **File Storage**: ✅ Multiple Providers Supported
- **Logging**: ✅ Winston Structured Logging

### Health Monitoring
```json
{
  "status": "OK",
  "timestamp": "2025-08-12T21:28:02.800Z",
  "uptime": 9.150,
  "database": {
    "status": "connected",
    "name": "sobienode"
  },
  "services": {
    "email": "configured",
    "sms": "not_configured"
  }
}
```

---

## 🔒 **Security & Access Levels**

### Access Level Guide
- 🔓 **Public**: No authentication required
- 🔐 **Authenticated**: Valid JWT token required
- 🔒 **Admin Only**: Admin role required
- 🔐 **Developer**: Technical documentation for developers

### Authentication Headers
```bash
# Required for authenticated endpoints
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## 📞 **Support & Resources**

### Development Resources
- **GitHub Repository**: [thesobie/sobieNode](https://github.com/thesobie/sobieNode)
- **Issue Tracker**: GitHub Issues
- **License**: [MIT License](./LICENSE)

### API Standards
- **REST Principles**: RESTful API design
- **HTTP Status Codes**: Standard HTTP responses
- **JSON Format**: Consistent JSON response structure
- **Error Handling**: Standardized error responses

### Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "timestamp": "2025-08-12T21:28:02.800Z"
}
```

---

## 🗺️ **Documentation Roadmap**

### Planned Documentation
- [ ] **Swagger/OpenAPI** - Interactive API documentation
- [ ] **Postman Collection** - Ready-to-use API collection
- [ ] **GraphQL Schema** - Future GraphQL implementation
- [ ] **WebSocket Events** - Real-time feature documentation
- [ ] **Database Schema** - Complete data model documentation
- [ ] **Deployment Guide** - Production deployment instructions

---

## 🎯 **Best Practices**

### API Usage
1. **Always authenticate** for protected endpoints
2. **Handle errors gracefully** with proper status codes
3. **Use pagination** for large data sets
4. **Implement caching** for frequently accessed data
5. **Follow rate limits** to avoid throttling

### Security Guidelines
1. **Store JWT tokens securely** (httpOnly cookies recommended)
2. **Validate all inputs** on the frontend
3. **Use HTTPS** in production
4. **Implement CSRF protection** for web applications
5. **Regular security audits** of dependencies

---

*Last Updated: August 12, 2025*  
*Documentation Version: 1.0.0*  
*Backend Version: 1.0.0*

---

<div align="center">

**🚀 Ready to build amazing applications with the SOBIE Conference API! 🚀**

*For questions or support, please create an issue in the GitHub repository.*

</div>
