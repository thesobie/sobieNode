# SOBIE Authentication API Documentation

This document provides complete documentation for the SOBIE Conference Platform authentication system, including JWT-based authentication, magic links, and session management.

## Table of Contents
- [Overview](#overview)
- [Authentication Methods](#authentication-methods)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Session Management](#session-management)
- [Error Handling](#error-handling)
- [Security Features](#security-features)
- [Frontend Integration](#frontend-integration)

## Overview

The SOBIE authentication system provides:
- **Traditional email/password authentication**
- **Magic link authentication** (passwordless login via email/SMS)
- **JWT-based sessions** with automatic refresh
- **Email verification** for new accounts
- **Password reset** functionality
- **Account lockout** protection
- **Role-based access control**
- **Comprehensive profile management**

## Authentication Methods

### 1. Email/Password Authentication
Traditional login with email and password.

### 2. Magic Link Authentication
Passwordless authentication via secure links sent to email or SMS.

### 3. Session Management
JWT tokens with automatic refresh and secure cookie storage.

---

## API Endpoints

### Registration & Login

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": {
    "firstName": "John",
    "lastName": "Doe",
    "prefix": "Dr.",
    "pronouns": "he/him"
  },
  "userType": "academic",
  "affiliation": {
    "organization": "University of Technology",
    "department": "Computer Science",
    "jobTitle": "Professor"
  },
  "magicLinkEnabled": false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "SOBIE Profile creation successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "_id": "user-id",
      "email": "user@example.com",
      "name": { "firstName": "John", "lastName": "Doe" },
      "userType": "academic",
      "roles": ["user"],
      "isEmailVerified": false
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token",
      "accessTokenExpiry": 1640995200000,
      "refreshTokenExpiry": 1641600000000
    },
    "emailVerificationSent": true
  }
}
```

#### POST `/api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "user-id",
      "email": "user@example.com",
      "fullName": "Dr. John Doe",
      "roles": ["user", "reviewer"],
      "primaryRole": "reviewer",
      "lastLogin": "2024-01-01T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token",
      "accessTokenExpiry": 1640995200000,
      "refreshTokenExpiry": 1641600000000
    }
  }
}
```

### Magic Link Authentication

#### POST `/api/auth/magic-link`
Request a magic link for passwordless login.

**Request Body:**
```json
{
  "email": "user@example.com",
  "method": "email"  // or "sms"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Magic link sent to your email",
  "data": {
    "method": "email",
    "expiresIn": "10 minutes"
  }
}
```

#### POST `/api/auth/magic-login`
Login using a magic link token.

**Request Body:**
```json
{
  "token": "magic-link-token-from-email"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Magic link login successful",
  "data": {
    "user": { /* user object */ },
    "tokens": { /* JWT tokens */ }
  }
}
```

### Token Management

#### POST `/api/auth/refresh`
Refresh an expired access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```
*Note: Refresh token can also be sent via secure cookies*

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-jwt-access-token",
    "accessTokenExpiry": 1640995200000
  }
}
```

#### GET `/api/auth/validate`
Validate current session/token.

**Headers:**
```
Authorization: Bearer jwt-access-token
```

**Response (200):**
```json
{
  "success": true,
  "valid": true,
  "data": {
    "user": { /* user object */ },
    "tokenInfo": {
      "expiresAt": 1640995200000,
      "issuedAt": 1640994300000,
      "timeUntilExpiry": 900000
    }
  }
}
```

### Email Verification

#### POST `/api/auth/verify-email`
Verify email address with token from verification email.

**Request Body:**
```json
{
  "token": "email-verification-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "_id": "user-id",
      "email": "user@example.com",
      "isEmailVerified": true
    }
  }
}
```

#### POST `/api/auth/resend-verification`
Resend email verification.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

### Password Management

#### POST `/api/auth/forgot-password`
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset link sent to your email",
  "data": {
    "expiresIn": "10 minutes"
  }
}
```

#### POST `/api/auth/reset-password`
Reset password using token from reset email.

**Request Body:**
```json
{
  "token": "password-reset-token",
  "password": "newSecurePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

#### PUT `/api/auth/change-password`
Change password for authenticated user.

**Headers:**
```
Authorization: Bearer jwt-access-token
```

**Request Body:**
```json
{
  "currentPassword": "currentPassword123",
  "newPassword": "newSecurePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Session Management

#### GET `/api/auth/me`
Get current user profile.

**Headers:**
```
Authorization: Bearer jwt-access-token
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user-id",
      "email": "user@example.com",
      "fullName": "Dr. John Doe",
      "name": { /* complete name object */ },
      "affiliation": { /* affiliation details */ },
      "roles": ["user", "reviewer"],
      "isEmailVerified": true,
      "lastLogin": "2024-01-01T10:00:00.000Z"
    }
  }
}
```

#### POST `/api/auth/logout`
Logout current user.

**Headers:**
```
Authorization: Bearer jwt-access-token
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Authentication Flow

### 1. Traditional Registration/Login Flow
```
1. User registers via POST /api/auth/register
2. System sends email verification
3. User verifies email via POST /api/auth/verify-email
4. User logs in via POST /api/auth/login
5. System returns JWT tokens and sets secure cookies
6. Frontend stores tokens and redirects to dashboard
```

### 2. Magic Link Flow
```
1. User requests magic link via POST /api/auth/magic-link
2. System sends email/SMS with magic link
3. User clicks link, frontend extracts token
4. Frontend calls POST /api/auth/magic-login with token
5. System returns JWT tokens and sets secure cookies
6. User is logged in automatically
```

### 3. Token Refresh Flow
```
1. Frontend detects expired access token
2. Frontend calls POST /api/auth/refresh with refresh token
3. System returns new access token
4. Frontend updates stored token and retries original request
```

---

## Session Management

### JWT Token Structure
- **Access Token**: Short-lived (15 minutes), contains user info and roles
- **Refresh Token**: Long-lived (7 days), used to generate new access tokens
- **Secure Cookies**: Automatically set for web clients, httpOnly and secure

### Automatic Session Management
- Access tokens automatically refresh before expiration
- Sessions automatically expire after 7 days of inactivity
- Account lockout after 5 failed login attempts (2-hour lockout)

### Session Validation
- Every protected endpoint validates JWT token
- User account status checked on each request
- Locked or inactive accounts are immediately rejected

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Please provide email and password"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid credentials",
  "code": "INVALID_CREDENTIALS"
}
```

#### 401 Token Expired
```json
{
  "success": false,
  "message": "Access token has expired",
  "code": "TOKEN_EXPIRED"
}
```

#### 423 Account Locked
```json
{
  "success": false,
  "message": "Account is temporarily locked due to security reasons",
  "code": "ACCOUNT_LOCKED",
  "lockUntil": "2024-01-01T12:00:00.000Z"
}
```

#### 403 Email Not Verified
```json
{
  "success": false,
  "message": "Email verification required",
  "code": "EMAIL_NOT_VERIFIED",
  "hint": "Please check your email and click the verification link."
}
```

#### 429 Rate Limited
```json
{
  "success": false,
  "message": "Too many authentication attempts, please try again later.",
  "retryAfter": 900
}
```

---

## Security Features

### Password Security
- Passwords hashed with bcrypt (12 rounds)
- Minimum 6 character password requirement
- Password history prevention (can't reuse current password)

### Account Protection
- Rate limiting on authentication endpoints
- Account lockout after failed attempts
- Secure password reset with time-limited tokens

### Token Security
- JWT tokens signed with secure secrets
- Refresh token rotation available
- Secure, httpOnly cookies for web clients
- CORS protection with allowed origins

### Magic Link Security
- Tokens expire in 10 minutes
- Single-use tokens (invalidated after use)
- Cryptographically secure token generation
- Rate limiting on magic link requests

---

## Frontend Integration

### Setting Up Authentication

```javascript
// 1. Check if user is authenticated
const checkAuth = async () => {
  try {
    const response = await fetch('/api/auth/validate', {
      credentials: 'include' // Include cookies
    });
    const data = await response.json();
    return data.valid;
  } catch (error) {
    return false;
  }
};

// 2. Login with email/password
const login = async (email, password) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });
  return response.json();
};

// 3. Request magic link
const requestMagicLink = async (email) => {
  const response = await fetch('/api/auth/magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};

// 4. Logout
const logout = async () => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
  return response.json();
};
```

### Handling Magic Links
```javascript
// Extract token from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const magicToken = urlParams.get('token');

if (magicToken) {
  // Login with magic link token
  const response = await fetch('/api/auth/magic-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token: magicToken })
  });
  
  if (response.ok) {
    // Redirect to dashboard
    window.location.href = '/dashboard';
  }
}
```

### Automatic Token Refresh
```javascript
// Axios interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      try {
        // Try to refresh token
        await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        });
        
        // Retry original request
        return axios.request(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Environment Setup

Required environment variables for authentication:
```bash
# JWT Configuration
JWT_SECRET=your-64-byte-random-secret
JWT_REFRESH_SECRET=your-64-byte-refresh-secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@sobie.org

# Optional SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Application URLs
FRONTEND_URL=http://localhost:3000
```

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

This authentication system provides enterprise-grade security with user-friendly features like magic links and automatic session management. All endpoints are rate-limited and include comprehensive error handling for production use.
