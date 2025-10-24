import pkg from "pg";
import { randomBytes } from "crypto";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();
const { Pool } = pkg;

class DatabaseManager {
  constructor() {
    this.pool = new Pool({
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD.toString(),
      database: process.env.PG_DATABASE,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.initializeConnection();
  }

  async initializeConnection() {
    try {
      await this.pool.connect();
      console.log("✅ PostgreSQL Connected Successfully");
    } catch (error) {
      console.error("❌ Connection Error:", error);
      throw error;
    }
  }

  async createUsersTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS baddeep (
        id VARCHAR(20) PRIMARY KEY,
        sequential_id SERIAL UNIQUE,
        username VARCHAR(100) NOT NULL,
        gmail VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        refresh_token TEXT,
        access_token TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_gmail ON users(gmail);
      CREATE INDEX IF NOT EXISTS idx_users_sequential ON users(sequential_id);
    `;

    try {
      await this.pool.query(createTableQuery);
      console.log("✅ Users table ready");
    } catch (error) {
      console.error("❌ Error creating users table:", error);
    }
  }

  generateUserId() {
    const timestamp = Date.now(); // numeric timestamp in milliseconds
    const randomPart = parseInt(crypto.randomBytes(4).toString("hex"), 16); // convert hex to decimal number
    return `usr_${timestamp}_${randomPart}`;
  }

  async createUser(userData, table) {
  if (!table) {
    return "missing table name";
  }

  const userId = this.generateUserId();

  try {
    const queries = {
      baddeep: {
        sql: `INSERT INTO baddeep(id, username, gmail, password, refreshtoken, accesstoken) 
              VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        params: [
          userId,
          userData.username,
          userData.gmail,
          userData.Password,
          userData.refresh_token,
          userData.Access_Token,
        ], 
      },
      users: {
        sql: `INSERT INTO users(id, username, email, hashed_password, refresh_token, expire_time, type) 
              VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        params: [
          userId,
          userData.username,
          userData.gmail,
          userData.Hashed_password,
          userData.refresh_token,
          userData.expire_time,
          userData.type,
        ],
      },
        google: {
        sql: `INSERT INTO googleuser(id, username, gmail, refresh_token, expire_time, type) 
              VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        params: [
          userId,
          userData.username,
          userData.gmail,
          userData.refresh_token,
          userData.expire_time,
          userData.type,
        ],
      },
        microsoft: {
        sql: `INSERT INTO microsoftusers(id, username, gmail,access_token, refresh_token, expire_time, type) 
              VALUES ($1, $2, $3, $4, $5, $6 ,$7) RETURNING *`,
        params: [
          userId,
          userData.username,
          userData.gmail,
          userData.Access_Token,
          userData.refresh_token, 
          userData.expire_time,
          userData.type,
        ],
      },

    };

    const query = queries[table.trim()];
    if (!query) {
      throw new Error(`❌ Unsupported table: ${table}`);
    }

    const result = await this.pool.query(query.sql, query.params);
    console.log(`✅ User created with ID: ${userId}`);
    return result.rows[0];

  } catch (error) {
    if (error.code === "23505") {
      throw new Error("User with this email already exists");
    }
    console.error("❌ Error creating user:", error);
    throw error;
  }
}

  async getUserById(id, table = 'users') {
    try {
      let query;
      if (table.trim() === 'baddeep') {
        query = `SELECT * FROM baddeep WHERE id = $1`;
      } else if (table.trim() === 'users') {
        query = `SELECT * FROM users WHERE id = $1`;
      } else {
        throw new Error('Invalid table name');
      }
      
      const result = await this.pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Error fetching user by ID:", error);
      throw error;
    }
  }

    // async getUserByEmail(email,table) {
    //   try {
    //     if(table.trim()==='baddeep'){

    //       const result = await this.pool.query(
    //         `SELECT * FROM baddeep WHERE gmail = $1`,
    //         [email]
    //       );
    //       return result.rows[0] || null;
    //     }
    //     else if(table.trim()==='users'){

    //       const result = await this.pool.query(
    //       `SELECT * FROM users WHERE email = $1`,
    //       [email]
    //     );
    //     return result.rows[0] || null;
    //     }
    //   } catch (error) {
    //     console.error("❌ Error fetching user by email:", error);
    //     throw error;
    //   }
    // }
    async getUserByEmail(email, table) {
  try {
    const queries = {
      baddeep: `SELECT * FROM baddeep WHERE gmail = $1`,
      users:   `SELECT * FROM users WHERE email = $1`,
      google: `SELECT * FROM googleuser WHERE gmail = $1`,
      microsoft: `SELECT * FROM microsoftusers WHERE gmail = $1`

    };

    const query = queries[table.trim()];
    if (!query) {
      throw new Error(`❌ Unsupported table: ${table}`);
    }

    const result = await this.pool.query(query, [email]);
    return result.rows[0] || null;

  } catch (error) {
    console.error("❌ Error fetching user by email:", error);
    throw error;
  }
}

  async getAllUsers(limit = 10, offset = 0) {

        limit = parseInt(limit)
    try {
      const result = await this.pool.query(
        `SELECT id, username, gmail, created_at 
         FROM baddeep 
         ORDER BY id DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return result.rows;
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      throw error;
    }
  }

  async updateUser(id, fields, table) {
  const trimmedTable = table.trim();
 const tablename= {
   microsoft:'microsoftusers',
   google:'googleuser',
   users:'users',
 } 
  // Define allowed fields per table
  const allowedFieldsMap = {
    baddeep: [
      "username",
      "gmail",
      "hashed_password",
      "refresh_token",
      "expire_time",
      "reset_token",
      "type",
    ],
    users: [
      "username",
      "gmail",
      "reset_token",
      "hashed_password",
      "refresh_token",
      "expire_time",
      "type",
      "verified",
    ],
      google: [
      "username",
      "gmail",
      "reset_token",
      "access_token",  
      "refresh_token",
      "expire_time",
      "type",
      "verified",
    ],
      microsoft: [
      "username",
      "gmail",
      "reset_token",
      
      "refresh_token",
      "access_token",      "expire_time",
      "type",
      "verified",
    ],
  };

  const allowedFields = allowedFieldsMap[trimmedTable];
  if (!allowedFields) {
    throw new Error(`❌ Unsupported table: ${tablename[trimmedTable]}`);
  }

  // Build dynamic SET clause
  const updates = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && allowedFields.includes(key)) {
      updates.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }
  }

  if (updates.length === 0) {
    throw new Error("No valid fields to update");
  }

  // Add id as last parameter
  values.push(id);

  const query = `
    UPDATE ${tablename[trimmedTable]}
    SET ${updates.join(", ")}
    WHERE id = $${index}
    RETURNING *`;

  try {
    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    console.log(`✅ User ${id} updated successfully`);
    return result.rows[0];
  } catch (error) {
    console.error("❌ Error updating user:", error);
    throw error;
  }
}

  async deleteUser(id) {
    try {
      const result = await this.pool.query(
        `DELETE FROM baddeep WHERE id = $1 RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      console.log(`✅ User ${id} deleted successfully`);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      throw error;
    } 
  }

  async getUserStats() {
    try {
      const result = await this.pool.query(
        `SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as users_today,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as users_this_week
         FROM users`
      );
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error fetching user stats:", error);
      throw error;
    }
  }

  async closeConnection() {
    try {
      await this.pool.end();
      console.log("✅ PostgreSQL connection closed");
    } catch (error) {
      console.error("❌ Error closing connection:", error);
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

// Export individual functions for backward compatibility
export const createUser = (userData , table) => dbManager.createUser(userData,table);
export const getUserById = (id, table) => dbManager.getUserById(id, table);
export const getUserByEmail = (email, table) => dbManager.getUserByEmail(email,table);
export const getAllUsers = (limit, offset) =>
  dbManager.getAllUsers(limit, offset);
export const updateUser = (id, fields,table) => dbManager.updateUser(id, fields,table);
export const deleteUser = (id) => dbManager.deleteUser(id);
export const getUserStats = () => dbManager.getUserStats();

export default dbManager;
