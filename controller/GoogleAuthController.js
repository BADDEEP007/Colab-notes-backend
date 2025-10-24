import {
  createUser,
  getUserByEmail,
  updateUser,
} from "../postgresql/Postgresql.js";

/**
 * Handle Google OAuth user creation/update in database
 * @param {Object} googleUserInfo - User info from Google API
 * @param {Object} tokens - OAuth tokens from Google
 * @returns {Object} Database user object
 */
export const handleGoogleUser = async (googleUserInfo, tokens) => {
  try {
    const {
      email,
      name,
      id: googleId,
      picture,
      verified_email,
    } = googleUserInfo;
    const { access_token, refresh_token } = tokens || {};

    // Check if user exists
    let dbUser = await getUserByEmail(email, "google");

    if (!dbUser) {
      // Create new user
      const userData = {
        username: name || email.split("@")[0],
         gmail :email,
        Hashed_password: null, // OAuth users don't have passwords
        refresh_token: refresh_token,
        Access_Token: access_token,
        expire_time: null,
        type: "google_oauth",
      };

      dbUser = await createUser(userData, "google");
          

      console.log(`✅ New Google user created: ${dbUser.id}`);

      return {
        user: dbUser,
        isNewUser: true,
        googleInfo: {
          googleId,
          picture,
          verified_email,
        },
      };
    } else {
      // Update existing user's tokens
      const updateData = {};
      if (refresh_token) updateData.refresh_token = refresh_token;
      if (access_token) updateData.access_token = access_token;

      if (Object.keys(updateData).length > 0) {
        dbUser = await updateUser(dbUser.id, updateData, "google");
        console.log(`✅ Updated tokens for user: ${dbUser.id}`);
      }

      return {
        user: dbUser,
        isNewUser: false,
        googleInfo: {
          googleId,
          picture,
          verified_email,
        },
      };
    }
  } catch (error) {
    console.error("❌ Error handling Google user:", error);
    throw error;
  }
};

/**
 * Generate user session data
 * @param {Object} dbUser - Database user object
 * @param {Object} googleInfo - Google user information
 * @returns {Object} Session data
 */
export const generateUserSession = (dbUser, googleInfo) => {
  return {
    userId: dbUser.id,
    username: dbUser.username,
    email: dbUser.gmail,
    picture: googleInfo.picture,
    verified: googleInfo.verified_email,
    loginMethod: "google",
    loginTime: new Date().toISOString(),
  };
};

/**
 * Validate Google authentication response
 * @param {Object} userInfo - User info from Google
 * @param {Object} tokens - OAuth tokens
 * @returns {boolean} Validation result
 */
export const validateGoogleAuth = (userInfo, tokens) => {
  const requiredUserFields = ["email", "name", "id"];
  const requiredTokens = ["access_token"];

  // Check user info
  for (const field of requiredUserFields) {
    if (!userInfo[field]) {
      throw new Error(`Missing required user field: ${field}`);
    }
  }

  // Check tokens
  for (const token of requiredTokens) {
    if (!tokens[token]) {
      throw new Error(`Missing required token: ${token}`);
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userInfo.email)) {
    throw new Error("Invalid email format");
  }

  return true;
};

/**
 * Handle authentication errors
 * @param {Error} error - Error object
 * @param {Object} res - Express response object
 */
export const handleAuthError = (error, res) => {
  console.error("Authentication error:", error);

  // Database errors
  if (error.message.includes("email already exists")) {
    return res.status(409).json({
      status: "error",
      message: "User with this email already exists",
      code: "USER_EXISTS",
    });
  }

  // Validation errors
  if (error.message.includes("Missing required")) {
    return res.status(400).json({
      status: "error",
      message: error.message,
      code: "VALIDATION_ERROR",
    });
  }

  // Token errors
  if (error.message.includes("Invalid token")) {
    return res.status(401).json({
      status: "error",
      message: "Invalid authentication token",
      code: "INVALID_TOKEN",
    });
  }

  // Generic error
  return res.status(500).json({
    status: "error",
    message: "Authentication failed",
    code: "AUTH_FAILED",
  });
};
