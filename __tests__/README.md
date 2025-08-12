# Test Directory Organization

This directory contains all **Jest unit tests** for the SOBIE Conference platform, organized by functionality.

## Directory Structure

```
__tests__/
├── auth/                    # Authentication setup
│   └── test-setup.js        # Jest test environment setup
├── content/                 # Content moderation tests
│   ├── contentModeration.test.js
│   └── userContentModeration.test.js
├── server.test.js           # Server-level tests
├── users.test.js           # User-related tests
└── README.md               # This file

scripts/                    # Utility and demo scripts (not Jest tests)
├── auth/                   # Authentication testing scripts
│   ├── test-auth.js        # Core authentication testing
│   ├── test-auth-simple.js # Simple authentication testing
│   ├── test-email.js       # Email functionality testing
│   ├── test-full-auth-flow.js # Complete authentication flow testing
│   └── test-message-update.js # Message update testing
└── demo/                   # Demo and example scripts
    └── demo-auth-flows.js  # Authentication flow demonstrations
```

## Running Tests

```bash
# Run all Jest tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test files
npm test -- __tests__/content/
npm test -- --testNamePattern="server"
```

## Running Auth Scripts

```bash
# Run authentication demo
npm run auth:demo

# Run full authentication flow test
npm run auth:test

# Run individual scripts
node scripts/auth/test-auth-simple.js
node scripts/auth/test-email.js
```

## Test Categories

- **Jest Unit Tests** (`__tests__/`): Automated testing with assertions
  - Authentication setup and configuration
  - Content moderation functionality  
  - Server and user integration testing

- **Testing Scripts** (`scripts/`): Interactive and manual testing
  - Authentication flow demonstrations
  - Email functionality verification
  - API endpoint testing
