import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
    this.resetTokenExpires = process.env.RESET_TOKEN_EXPIRES || "1h";
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    try {
      const saltRounds = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return hashedPassword;
    } catch (error) {
      console.error("❌ Error hashing password:", error);
      throw new Error("Password hashing failed");
    }
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {Promise<boolean>} Password match result
   */
  async comparePassword(password, hashedPassword) {
    try {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      return isMatch;
    } catch (error) {
      console.error("❌ Error comparing password:", error);
      throw new Error("Password comparison failed");
    }
  }

  /**
   * Generate JWT access token
   * @param {Object} payload - Token payload (user data)
   * @returns {string} JWT token
   */
  generateAccessToken(payload) {
    try {
      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn,
        issuer: "colabnotes",
        audience: "colabnotes-users",
      });
      return token;
    } catch (error) {
      console.error("❌ Error generating access token:", error);
      throw new Error("Token generation failed");
    }
  }

  /**
   * Generate JWT refresh token
   * @param {Object} payload - Token payload (user data)
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(payload) {
    try {
      const token = jwt.sign(payload, this.refreshSecret, {
        expiresIn: this.refreshExpiresIn,
        issuer: "colabnotes",
        audience: "colabnotes-users",
      });
      return token;
    } catch (error) {
      console.error("❌ Error generating refresh token:", error);
      throw new Error("Refresh token generation failed");
    }
  }

  /**
   * Verify JWT access token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: "colabnotes",
        audience: "colabnotes-users",
      });
      return decoded;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid token");
      } else {
        console.error("❌ Error verifying access token:", error);
        throw new Error("Token verification failed");
      }
    }
  }

  /**
   * Verify JWT refresh token
   * @param {string} token - JWT refresh token to verify
   * @returns {Object} Decoded token payload
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        issuer: "colabnotes",
        audience: "colabnotes-users",
      });
      return decoded;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Refresh token expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid refresh token");
      } else {
        console.error("❌ Error verifying refresh token:", error);
        throw new Error("Refresh token verification failed");
      }
    }
  }

  /**
   * Generate password reset token
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @returns {string} Reset token
   */
  generateResetToken(userId, email) {
    try {
      const payload = {
        userId,
        email,
        type: "password_reset",
        timestamp: Date.now(),
      };

      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.resetTokenExpires,
        issuer: "colabnotes",
        audience: "colabnotes-reset",
      });

      return token;
    } catch (error) {
      console.error("❌ Error generating reset token:", error);
      throw new Error("Reset token generation failed");
    }
  }

  /**
   * Verify password reset token
   * @param {string} token - Reset token to verify
   * @returns {Object} Decoded token payload
   */
  verifyResetToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: "colabnotes",
        audience: "colabnotes-reset",
      });

      if (decoded.type !== "password_reset") {
        throw new Error("Invalid token type");
      }

      return decoded;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Reset token expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Invalid reset token");
      } else {
        console.error("❌ Error verifying reset token:", error);
        throw new Error("Reset token verification failed");
      }
    }
  }

  /**
   * Generate secure random token for email verification
   * @returns {string} Random token
   */
  generateSecureToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Create token pair (access + refresh)
   * @param {Object} user - User object
   * @returns {Object} Token pair
   */
  createTokenPair(user) {
    const payload = {
      userId: user.id,
      email: user.gmail,
      username: user.username,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken({ userId: user.id });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtExpiresIn,
      tokenType: "Bearer",
    };
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!hasUpperCase) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!hasLowerCase) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!hasNumbers) {
      errors.push("Password must contain at least one number");
    }

    if (!hasSpecialChar) {
      errors.push("Password must contain at least one special character");
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password),
    };
  }

  /**
   * Calculate password strength score
   * @param {string} password - Password to analyze
   * @returns {Object} Strength analysis
   */
  calculatePasswordStrength(password) {
    let score = 0;
    let feedback = [];

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Complexity patterns
    if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated characters
    if (!/123|abc|qwe/i.test(password)) score += 1; // No common sequences

    let strength = "Very Weak";
    if (score >= 7) strength = "Very Strong";
    else if (score >= 5) strength = "Strong";
    else if (score >= 3) strength = "Medium";
    else if (score >= 1) strength = "Weak";

    return {
      score,
      strength,
      feedback,
    };
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Validation result
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate user session data
   * @param {Object} user - User object
   * @param {Object} request - Request object for metadata
   * @returns {Object} Session data
   */
  generateSessionData(user, request = {}) {
    return {
      userId: user.id,
      username: user.username,
      email: user.gmail,
      loginTime: new Date().toISOString(),
      ip: request.ip || request.connection?.remoteAddress,
      userAgent: request.get?.("User-Agent"),
      sessionId: this.generateSecureToken(),
    };
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
