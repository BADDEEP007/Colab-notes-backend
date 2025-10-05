# JWT Authentication System Documentation

## Overview
Complete JWT-based authentication system for ColabNotes with email/password login, registration, password reset, username recovery, and email notifications.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)
- [Email Services](#email-services)
- [Testing](#testing)
- [Configuration](#configuration)
- [Deployment](#deployment)

## Features

### ✅ **Core Authentication**
- User registration with email/password
- Secure login with JWT tokens
- Token refresh mechanism
- Logout with token invalidation
- Password strength validation
- Email format validation

### ✅ **Account Recovery**
- Password reset via email
- Username recovery via email
- Secure token-based reset system
- Rate limiting for security

### ✅ **User Management**
- Get current user profile
- Change password (authenticated)
- Session management
- User activity logging

### ✅ **Security Features**
- bcrypt password hashing (12 rounds)
- JWT token signing and verification
- Rate limiting on auth endpoints
- Request validation middleware
- Authentication logging
- Token expiration handling

### ✅ **Email Services**
- Welcome emails for new users
- Password reset emails with secure links
- Username recovery emails
- Login notification emails
- HTML email templates

## Architecture

### **Service Layer**
```
services/
├── authService.js      # JWT & password operations
└── emailService.js     # Email sending & templates
```

### **Controller Layer**
```
controller/
└── authController.js   # Authentication endpoints
```

### **Middleware Layer**
```
middleware/
└── authMiddleware.js   # Authentication & validation
```

### **Database Layer**
```
postgresql/
└── Postgresql.js      # User data operations
```

## API Endpoints

### **Authentication Endpoints**

#### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "usr_1234567890_abcdef12",
      "username": "john_doe",
      "email": "john@example.com",
      "created_at": "2024-01-01T12:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": "7d",
      "tokenType": "Bearer"
    },
    "session": {
      "userId": "usr_1234567890_abcdef12",
      "loginTime": "2024-01-01T12:00:00Z",
      "sessionId": "abc123..."
    }
  }
}
```

#### 2. Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### 3. Refresh Tokens
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 4. Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

#### 5. Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

#### 6. Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

### **Account Recovery Endpoints**

#### 7. Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### 8. Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "newPassword": "NewPass123!"
}
```

#### 9. Recover Username
```http
POST /api/auth/recover-username
Content-Type: application/json

{
  "email": "john@example.com"
}
```

## Security Features

### **Password Security**
- **Hashing**: bcrypt with 12 salt rounds
- **Strength Requirements**:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character

### **JWT Security**
- **Access Tokens**: 7 days expiration
- **Refresh Tokens**: 30 days expiration
- **Signing**: HMAC SHA256
- **Claims**: issuer, audience, expiration
- **Verification**: Signature and claims validation

### **Rate Limiting**
- **Authentication**: 5 attempts per 15 minutes
- **Password Reset**: 3 attempts per hour
- **Username Recovery**: 3 attempts per hour

### **Request Validation**
- Required field validation
- Email format validation
- Password strength validation
- Token format validation

## Email Services

### **SMTP Configuration**
Uses Gmail SMTP with app passwords:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### **Email Templates**

#### 1. Welcome Email
- Sent on successful registration
- Includes dashboard link
- Getting started guide

#### 2. Password Reset Email
- Secure reset link with token
- 1-hour expiration notice
- Security warnings

#### 3. Username Recovery Email
- Displays username clearly
- Login link included
- Security tips

#### 4. Login Notification Email
- Login details (time, IP, device)
- Security alerts
- Action buttons

## Testing

### **Interactive Test Interface**
Visit: `http://localhost:5000/test/jwt-auth`

**Features:**
- Registration testing
- Login testing
- Password reset flow
- Username recovery
- Token refresh
- Profile management
- Password change

### **Manual Testing Examples**

#### Register New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

#### Login User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

#### Get Profile (with token)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Configuration

### **Environment Variables**

#### JWT Configuration
```env
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_complex_2024
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_key_here_different_from_main
JWT_REFRESH_EXPIRES_IN=30d
```

#### Email Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM="ColabNotes <your_email@gmail.com>"
```

#### Security Configuration
```env
RESET_TOKEN_EXPIRES=1h
FRONTEND_URL=http://localhost:3000
```

### **Gmail App Password Setup**
1. Enable 2-Factor Authentication on Gmail
2. Go to Google Account Settings
3. Security → App passwords
4. Generate app password for "Mail"
5. Use generated password in `SMTP_PASS`

## Deployment

### **Production Considerations**

#### 1. Environment Security
- Use strong, unique JWT secrets
- Secure email credentials
- Enable HTTPS only
- Set secure cookie flags

#### 2. Database Security
- Use connection pooling
- Enable SSL connections
- Regular backups
- Monitor for suspicious activity

#### 3. Rate Limiting
- Implement Redis-based rate limiting
- Monitor authentication attempts
- Block suspicious IPs
- Log security events

#### 4. Email Delivery
- Use professional email service (SendGrid, AWS SES)
- Configure SPF, DKIM, DMARC records
- Monitor delivery rates
- Handle bounces and complaints

### **Monitoring & Logging**

#### Authentication Events
```javascript
// Logged events include:
{
  event: 'LOGIN|REGISTER|LOGOUT|FORGOT_PASSWORD|RESET_PASSWORD',
  timestamp: '2024-01-01T12:00:00Z',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  email: 'user@example.com',
  success: true|false
}
```

#### Security Alerts
- Multiple failed login attempts
- Password reset requests
- Unusual login locations
- Token manipulation attempts

## Error Handling

### **Common Error Codes**
- `TOKEN_MISSING` - No authorization token provided
- `TOKEN_EXPIRED` - Access token has expired
- `TOKEN_INVALID` - Malformed or invalid token
- `USER_EXISTS` - Email already registered
- `INVALID_CREDENTIALS` - Wrong email/password
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `RATE_LIMITED` - Too many requests
- `USER_NOT_FOUND` - User doesn't exist

### **Error Response Format**
```json
{
  "status": "error",
  "message": "Human readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "specific error details"
  }
}
```

## Best Practices

### **Security**
1. Always use HTTPS in production
2. Implement proper CORS policies
3. Validate all input data
4. Log security events
5. Monitor for suspicious activity
6. Regular security audits

### **Performance**
1. Use connection pooling for database
2. Implement caching for user sessions
3. Optimize email sending (queues)
4. Monitor response times
5. Use CDN for static assets

### **Maintenance**
1. Regular dependency updates
2. Monitor error rates
3. Backup user data regularly
4. Test recovery procedures
5. Document all changes

---

**File Locations:**
- **Services**: `services/authService.js`, `services/emailService.js`
- **Controllers**: `controller/authController.js`
- **Middleware**: `middleware/authMiddleware.js`
- **Routes**: `routes/routes.js`
- **Tests**: `public/auth-test.html`
- **Config**: `.env`

**Dependencies:** `jsonwebtoken`, `bcryptjs`, `nodemailer`, `crypto-js`