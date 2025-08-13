---
layout: default
title: Directory Organization
nav_order: 6
description: "Project structure and file organization guide"
---

# SOBIE Node - Directory Organization
{: .fs-8 }

## 📁 Project Structure
{: .fs-6 .fw-300 }

The SOBIE Node project is now properly organized with the following structure:

```
sobieNode/
├── 📄 Configuration Files
│   ├── .env.example                 # Environment template
│   ├── .eslintrc.js                # ESLint configuration
│   ├── jest.config.js              # Jest testing configuration
│   ├── package.json                # Node.js dependencies
│   └── package-lock.json           # Dependency lock file
│
├── 📚 docs/                        # Documentation
│   ├── DUAL_ROLE_SYSTEM.md         # Dual role system documentation
│   ├── MEMORIAL_SYSTEM.md          # Memorial system documentation
│   ├── DUPLICATE_MERGE_SUCCESS_REPORT.md # Duplicate merge report
│   ├── PROFILE_DASHBOARD_INTEGRATION.md  # Profile integration docs
│   ├── PROJECT_STATUS_FINAL.md     # Final project status
│   ├── ADMIN_API.md                # Admin API documentation
│   ├── AUTHENTICATION_API.md       # Auth API documentation
│   ├── README.md                   # Main documentation
│   └── apis/                       # API documentation
│
├── 🧪 __tests__/                   # Test Suite
│   ├── profiles/                   # Profile-related tests
│   │   └── test-historical-profile.js
│   ├── integration/                # Integration tests
│   │   ├── test-migration.js
│   │   └── test-sobie-history-api.js
│   ├── auth/                       # Authentication tests
│   ├── comprehensive-app-test.js   # Full application test
│   └── setup.js                    # Test setup configuration
│
├── 🔧 scripts/                     # Utility Scripts
│   ├── 📊 Data Migration
│   │   ├── migrate-multi-year.js
│   │   ├── migrate-sobie-2023-fixed.js
│   │   ├── migrate-sobie-2023.js
│   │   ├── enhance-historical-users.js
│   │   └── merge-duplicate-users.js
│   │
│   ├── 📄 PDF Processing
│   │   └── analyze-pdf-direct.js
│   │
│   ├── 🛠️ Shell Scripts
│   │   ├── migrate-multi-year.sh
│   │   ├── populate-database.sh
│   │   ├── process-and-analyze.sh
│   │   ├── run-parser-updated.sh
│   │   └── test-program-parser.sh
│   │
│   ├── 🎭 demo/                    # Demo Scripts
│   │   ├── dual-role-demo.js       # Dual role system demo
│   │   ├── memorial-system-guide.js # Memorial system demo
│   │   └── demo-profile-dashboard.js # Profile dashboard demo
│   │
│   └── 🔍 Utilities
│       ├── scan-project.js
│       ├── debug-api-auth.js
│       ├── validate-environment.js
│       └── comprehensive-audit.js
│
├── 💻 src/                         # Source Code
│   ├── controllers/                # Request handlers
│   ├── models/                     # Database models
│   ├── routes/                     # API routes
│   ├── middleware/                 # Custom middleware
│   ├── services/                   # Business logic
│   ├── utils/                      # Utility functions
│   └── config/                     # Configuration files
│
├── 📊 migration-reports/           # Migration Results
├── 📁 logs/                        # Application logs
├── 📁 temp/                        # Temporary files
└── 📁 uploads/                     # File uploads
```

## 🎯 Key Organizational Improvements

### ✅ **Documentation Centralized**
- All `.md` files moved to `docs/` directory
- System documentation properly categorized
- API documentation in dedicated `apis/` subdirectory

### ✅ **Scripts Organized by Purpose**
- **Migration Scripts**: Multi-year data migration tools
- **Demo Scripts**: System demonstration utilities in `demo/` subdirectory
- **Shell Scripts**: Automation and batch processing tools
- **Utility Scripts**: Development and debugging tools

### ✅ **Tests Properly Located**
- All test files moved to `__tests__/` directory
- Tests organized by functionality (profiles, integration, auth)
- Maintains Jest testing framework structure

### ✅ **Clean Root Directory**
- Only essential configuration files remain in root
- No loose scripts or documentation files
- Professional project structure

## 📋 File Movement Summary

### Documentation → `docs/`
- `DUAL_ROLE_SYSTEM.md` → `docs/DUAL_ROLE_SYSTEM.md`
- `MEMORIAL_SYSTEM.md` → `docs/MEMORIAL_SYSTEM.md`
- `DUPLICATE_MERGE_SUCCESS_REPORT.md` → `docs/DUPLICATE_MERGE_SUCCESS_REPORT.md`
- `PROFILE_DASHBOARD_INTEGRATION.md` → `docs/PROFILE_DASHBOARD_INTEGRATION.md`
- `PROJECT_STATUS_FINAL.md` → `docs/PROJECT_STATUS_FINAL.md`

### Scripts → `scripts/`
- Migration scripts: `migrate-*.js` files
- Analysis scripts: `analyze-pdf-direct.js`, `scan-project.js`
- Demo scripts: `*-demo.js`, `*-guide.js` → `scripts/demo/`
- Shell scripts: `*.sh` files

### Tests → `__tests__/`
- `test-historical-profile.js` → `__tests__/profiles/`
- `test-migration.js` → `__tests__/integration/`
- `test-sobie-history-api.js` → `__tests__/integration/`

## 🔗 Quick Access

### 📚 **Documentation**
```bash
# View main documentation
open docs/README.md

# View system documentation
open docs/DUAL_ROLE_SYSTEM.md
open docs/MEMORIAL_SYSTEM.md
```

### 🎭 **Demo Scripts**
```bash
# Run dual role system demo
node scripts/demo/dual-role-demo.js

# Run memorial system demo
node scripts/demo/memorial-system-guide.js

# Run profile dashboard demo
node scripts/demo/demo-profile-dashboard.js
```

### 🧪 **Run Tests**
```bash
# Run all tests
npm test

# Run specific test suites
npm test __tests__/profiles/
npm test __tests__/integration/
```

### 🔧 **Utility Scripts**
```bash
# Database migration
node scripts/migrate-multi-year.js

# Project scanning
node scripts/scan-project.js

# Environment validation
node scripts/validate-environment.js
```

## 🎉 **Benefits of New Organization**

✅ **Developer Experience**: Clear separation of concerns  
✅ **Maintainability**: Easy to locate specific file types  
✅ **Professional Structure**: Industry-standard project layout  
✅ **Scalability**: Organized structure supports growth  
✅ **Documentation**: Centralized and accessible docs  
✅ **Testing**: Proper test organization and discovery  

The SOBIE Node project now follows professional Node.js project organization standards with clear separation between source code, documentation, scripts, and tests.
