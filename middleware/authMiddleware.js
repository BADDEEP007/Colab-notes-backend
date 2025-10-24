import authService from '../services/authService.js';
import { getUserById } from '../postgresql/Postgresql.js';

/**
 * Middleware to authenticate JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify the token
    const decoded = authService.verifyAccessToken(token);
    
    // Get user from database to ensure they still exist
    const user = await getUserById(decoded.userId, 'users');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Add user info to request object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.gmail,
      created_at: user.created_at
    };

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    
    if (error.message === 'Token expired') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.message === 'Invalid token') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    } else {
      return res.status(500).json({
        status: 'error',
        message: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  }
};

/**
 * Middleware to optionally authenticate JWT tokens (doesn't fail if no token)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = authService.verifyAccessToken(token);
    const user = await getUserById(decoded.userId, 'users');
    
    req.user = user ? {
      id: user.id,
      username: user.username,
      email: user.email || user.gmail,
      created_at: user.created_at
    } : null;

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    req.user = null;
    next();
  }
};

/**
 * Middleware to check if user is admin (example role-based auth)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Check if user has admin role (you can extend user schema to include roles)
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  }

  next();
};

/**
 * Middleware to validate request body fields
 * @param {Array} requiredFields - Array of required field names
 * @returns {Function} Middleware function
 */
export const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    for (const field of requiredFields) {
      if (!req.body[field] || req.body[field].toString().trim() === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        code: 'MISSING_FIELDS',
        missingFields
      });
    }

    next();
  };
};

/**
 * Middleware to validate email format
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateEmail = (req, res, next) => {
  const { gmail } = req.body;
  
  if (!gmail) {
    return res.status(400).json({
      status: 'error',
      message: 'Email is required',
      code: 'EMAIL_REQUIRED'
    });
  }

  if (!authService.validateEmail(gmail)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid email format',
      code: 'INVALID_EMAIL'
    });
  }

  next();
};

/**
 * Middleware to validate password strength
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validatePassword = (req, res, next) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({
      status: 'error',
      message: 'Password is required',
      code: 'PASSWORD_REQUIRED'
    });
  }

  const validation = authService.validatePassword(password);
  
  if (!validation.isValid) {
    return res.status(400).json({
      status: 'error',
      message: 'Password does not meet requirements',
      code: 'WEAK_PASSWORD',
      errors: validation.errors,
      strength: validation.strength
    });
  }

  // Add password strength info to request for logging
  req.passwordStrength = validation.strength;
  next();
};

/**
 * Middleware to rate limit authentication attempts
 * Simple in-memory rate limiting (use Redis in production)
 */
const authAttempts = new Map();

export const rateLimitAuth = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip + ':' + (req.body.email || req.body.username || 'unknown');
    const now = Date.now();
    
    if (!authAttempts.has(key)) {
      authAttempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const attempts = authAttempts.get(key);
    
    if (now > attempts.resetTime) {
      // Reset the counter
      authAttempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (attempts.count >= maxAttempts) {
      const remainingTime = Math.ceil((attempts.resetTime - now) / 1000 / 60);
      return res.status(429).json({
        status: 'error',
        message: `Too many authentication attempts. Try again in ${remainingTime} minutes.`,
        code: 'RATE_LIMITED',
        retryAfter: remainingTime
      });
    }

    attempts.count++;
    next();
  };
};

/**
 * Middleware to log authentication events
 * @param {string} eventType - Type of auth event
 * @returns {Function} Middleware function
 */
export const logAuthEvent = (eventType) => {
  return (req, res, next) => {
    
    res.on("finish",()=> {
      // Log the authentication event
      const logData = {
        event: eventType,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        email: req.body?.gmail || req.user?.email,
        success: res.statusCode < 400
      };
      
      console.log(`🔐 Auth Event [${eventType}]:`, logData);
      
      // Call original send
    });
    
    next();
  };
};