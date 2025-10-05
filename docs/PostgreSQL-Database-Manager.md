# PostgreSQL Database Manager Documentation

## Overview
The `postgresql/Postgresql.js` file provides a comprehensive database management system for user operations using PostgreSQL. It implements a singleton pattern with connection pooling and automatic table creation.

## Table of Contents
- [Class Structure](#class-structure)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [API Methods](#api-methods)
- [Error Handling](#error-handling)
- [Usage Examples](#usage-examples)
- [Environment Variables](#environment-variables)

## Class Structure

### DatabaseManager Class
A singleton class that manages PostgreSQL connections and user operations.

```javascript
class DatabaseManager {
  constructor()           // Initializes connection pool
  initializeConnection()  // Establishes database connection
  createUsersTable()     // Creates users table and indexes
  generateUserId()       // Generates unique user IDs
  // ... CRUD operations
}
```

## Configuration

### Connection Pool Settings
```javascript
{
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,                    // Maximum connections
  idleTimeoutMillis: 30000,   // 30 seconds
  connectionTimeoutMillis: 2000 // 2 seconds
}
```

## Database Schema

### Users Table Structure
```sql
CREATE TABLE users (
  id VARCHAR(20) PRIMARY KEY,           -- Custom generated ID
  sequential_id SERIAL UNIQUE,          -- Auto-incrementing number
  username VARCHAR(100) NOT NULL,       -- User's display name
  gmail VARCHAR(255) UNIQUE NOT NULL,   -- User's email (unique)
  password VARCHAR(255),                -- Hashed password
  refresh_token TEXT,                   -- OAuth refresh token
  access_token TEXT,                    -- OAuth access token
  created_at TIMESTAMP DEFAULT NOW(),   -- Creation timestamp
  updated_at TIMESTAMP DEFAULT NOW()    -- Last update timestamp
);
```

### Indexes
- `idx_users_gmail` - Index on email for fast lookups
- `idx_users_sequential` - Index on sequential_id for ordering

## API Methods

### 1. createUser(userData)
Creates a new user with auto-generated ID.

**Parameters:**
```javascript
userData = {
  username: string,      // Required
  gmail: string,         // Required (must be unique)
  password: string,      // Optional
  refreshToken: string,  // Optional
  accessToken: string    // Optional
}
```

**Returns:** User object with generated ID

**Example:**
```javascript
const newUser = await createUser({
  username: "john_doe",
  gmail: "john@example.com",
  password: "hashed_password"
});
```

### 2. getUserById(id)
Retrieves a user by their unique ID.

**Parameters:**
- `id` (string) - User's unique identifier

**Returns:** User object or `null` if not found

**Example:**
```javascript
const user = await getUserById("usr_lx2k9m_a1b2c3d4");
```

### 3. getUserByEmail(email)
Retrieves a user by their email address.

**Parameters:**
- `email` (string) - User's email address

**Returns:** User object or `null` if not found

**Example:**
```javascript
const user = await getUserByEmail("john@example.com");
```

### 4. getAllUsers(limit, offset)
Retrieves paginated list of users.

**Parameters:**
- `limit` (number) - Maximum number of users to return (default: 50)
- `offset` (number) - Number of users to skip (default: 0)

**Returns:** Array of user objects (excludes sensitive data)

**Example:**
```javascript
const users = await getAllUsers(20, 0); // First 20 users
```

### 5. updateUser(id, fields)
Updates user information.

**Parameters:**
- `id` (string) - User's unique identifier
- `fields` (object) - Fields to update

**Allowed Fields:**
- `username`
- `gmail`
- `password`
- `refresh_token`
- `access_token`

**Returns:** Updated user object

**Example:**
```javascript
const updatedUser = await updateUser("usr_lx2k9m_a1b2c3d4", {
  username: "new_username",
  gmail: "newemail@example.com"
});
```

### 6. deleteUser(id)
Permanently deletes a user.

**Parameters:**
- `id` (string) - User's unique identifier

**Returns:** Deleted user object

**Example:**
```javascript
const deletedUser = await deleteUser("usr_lx2k9m_a1b2c3d4");
```

### 7. getUserStats()
Retrieves user statistics.

**Returns:** Statistics object
```javascript
{
  total_users: number,     // Total number of users
  users_today: number,     // Users created in last 24 hours
  users_this_week: number  // Users created in last 7 days
}
```

**Example:**
```javascript
const stats = await getUserStats();
console.log(`Total users: ${stats.total_users}`);
```

## ID Generation System

### Custom User IDs
The system generates unique IDs using the format: `usr_{timestamp}_{random}`

**Example:** `usr_lx2k9m_a1b2c3d4`

**Components:**
- `usr_` - Prefix for identification
- `lx2k9m` - Base36 encoded timestamp
- `a1b2c3d4` - 8-character random hex string

### Sequential IDs
Additionally maintains auto-incrementing `sequential_id` for:
- Ordering users by creation time
- Internal database operations
- Backup identification

## Error Handling

### Common Error Codes
- `23505` - Unique constraint violation (duplicate email)
- Connection errors - Database connectivity issues
- Validation errors - Missing required fields

### Error Examples
```javascript
try {
  await createUser({ username: "test" }); // Missing gmail
} catch (error) {
  console.error(error.message); // "User with this email already exists"
}
```

## Usage Examples

### Complete User Lifecycle
```javascript
// 1. Create user
const newUser = await createUser({
  username: "alice_smith",
  gmail: "alice@example.com",
  password: "hashed_password_123"
});

// 2. Retrieve user
const user = await getUserById(newUser.id);

// 3. Update user
const updated = await updateUser(user.id, {
  username: "alice_johnson"
});

// 4. Get statistics
const stats = await getUserStats();

// 5. Delete user (if needed)
const deleted = await deleteUser(user.id);
```

### Pagination Example
```javascript
// Get users in batches of 25
let offset = 0;
const limit = 25;

do {
  const users = await getAllUsers(limit, offset);
  console.log(`Batch ${offset/limit + 1}:`, users.length, 'users');
  
  // Process users...
  
  offset += limit;
} while (users.length === limit);
```

## Environment Variables

### Required Configuration
Add these to your `.env` file:

```env
# PostgreSQL Database Configuration
PG_HOST=localhost
PG_PORT=5432
PG_USER=your_username
PG_PASSWORD=your_password
PG_DATABASE=colab_notes
NODE_ENV=development
```

### Production Settings
For production environments:
```env
NODE_ENV=production
PG_HOST=your-production-host
PG_PORT=5432
PG_USER=production_user
PG_PASSWORD=secure_production_password
PG_DATABASE=colab_notes_prod
```

## Best Practices

### 1. Connection Management
- The singleton pattern ensures single connection pool
- Automatic connection initialization
- Graceful error handling

### 2. Security
- SQL injection prevention using parameterized queries
- Password field handling (store hashed passwords only)
- SSL configuration for production

### 3. Performance
- Indexed email lookups
- Connection pooling (max 20 connections)
- Efficient pagination queries

### 4. Data Integrity
- Unique email constraints
- Required field validation
- Automatic timestamp management

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:5432
   ```
   - Ensure PostgreSQL is running
   - Check host/port configuration

2. **Authentication Failed**
   ```
   Error: password authentication failed
   ```
   - Verify username/password in .env
   - Check PostgreSQL user permissions

3. **Database Not Found**
   ```
   Error: database "colab_notes" does not exist
   ```
   - Create database: `CREATE DATABASE colab_notes;`

4. **Table Creation Issues**
   ```
   Error: permission denied for schema public
   ```
   - Grant permissions: `GRANT ALL ON SCHEMA public TO username;`

## Migration Notes

### From Other Systems
When migrating from other user systems:
1. Map existing user IDs to new format
2. Preserve creation timestamps
3. Handle email uniqueness constraints
4. Migrate tokens if applicable

### Schema Updates
To modify the schema:
1. Create migration scripts
2. Test on development first
3. Backup production data
4. Apply changes during maintenance window

## Performance Monitoring

### Key Metrics
- Connection pool utilization
- Query execution times
- Error rates
- User growth statistics

### Logging
The system provides comprehensive logging:
- ✅ Success operations with user IDs
- ❌ Error operations with details
- 📊 Connection status updates

---

**File Location:** `postgresql/Postgresql.js`  
**Last Updated:** Current  
**Dependencies:** `pg`, `crypto`, `dotenv`