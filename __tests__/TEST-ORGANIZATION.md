# SOBIE Test Suite Organization

This directory contains the organized test suite for the SOBIE platform, structured by API resources and functionality areas.

## Directory Structure

### 📁 API Resource Tests
- **`auth/`** - Authentication and authorization tests
- **`communications/`** - Communication system tests  
- **`community/`** - Community features tests
- **`bug-reports/`** - Bug reporting system tests
- **`profiles/`** - User profile management tests
- **`suggestions/`** - Suggestion system tests
- **`conference/`** - Conference management tests
- **`coauthors/`** - Co-author management tests
- **`research/`** - Research submission tests
- **`payments/`** - Payment processing tests
- **`programs/`** - Program building tests
- **`proceedings/`** - Proceedings workflow tests
- **`participation/`** - User participation tests
- **`availability/`** - Presenter availability tests

### 📁 Support Tests
- **`core/`** - Core functionality tests
- **`associations/`** - User association and linking tests  
- **`test-runners/`** - Comprehensive test suite runners
- **`utilities/`** - Utility and seed tests

### 📁 Legacy Directories (Migration Markers Only)
- **`manual/`** - Contains migration markers pointing to new locations
- **`safety/`** - Contains migration markers pointing to new locations

## Running Tests

### Individual Test Categories
```bash
# Run auth tests
cd __tests__/auth && node test-full-auth-flow.js

# Run research management tests  
cd __tests__/research && node test-research-submission.js

# Run core functionality tests
cd __tests__/core && node test-quick-core.js
```

### Comprehensive Test Suites
```bash
# Run main comprehensive test suite
cd __tests__/test-runners && node run-comprehensive-tests.js

# Run corrected comprehensive test suite (with Research Management focus)
cd __tests__/test-runners && node run-corrected-comprehensive-tests.js
```

### Utilities
```bash
# Run database seed test
cd __tests__/utilities && node test-seed.js

# Run enhanced user association tests
cd __tests__/associations && node test-enhanced-association.js
```

## Test Categories

### 🔐 Security & Authentication
- User registration and login
- Password validation
- JWT token management
- Session handling

### 👥 User Management
- Profile management
- User participation tracking
- Association and linking
- Community features

### 🔬 Research Management
- Research submission workflow
- Co-author management
- Presenter availability
- Proceedings workflow

### 🏛️ Conference Management
- Conference administration
- Registration systems
- Program building
- Availability tracking

### 💰 Financial
- Payment processing
- Transaction management
- Financial reporting

### 🔧 System Features
- Communication systems
- Suggestion systems
- Bug reporting
- Content moderation

### 🧪 Core & Utilities
- Database connectivity
- Model validation
- Service integration
- Utility functions

## Migration History

All tests have been migrated from scattered `manual/` and `safety/` directories to this organized structure as of December 2024. Original file locations are marked with migration notices indicating new locations.

## Notes

- Import paths have been standardized to use `../../src/` for proper relative imports
- All tests maintain their original functionality while being properly organized  
- Test runners have been updated to reference the new directory structure
- Legacy directories contain only migration markers for safe cleanup

## Test Organization Benefits

✅ **Resource-Aligned Structure**: Tests organized by API resources for better maintainability  
✅ **Consistent Import Paths**: Standardized relative imports across all test files  
✅ **Comprehensive Test Runners**: Multiple test suite runners for different scenarios  
✅ **Clear Migration History**: Full documentation of file movements and reorganization  
✅ **Functional Categories**: Tests grouped by system functionality and features
