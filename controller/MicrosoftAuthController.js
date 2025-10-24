import { createUser, getUserByEmail, updateUser } from "../postgresql/Postgresql.js";

/**
 * Handle Microsoft OAuth user creation/update in database
 * @param {Object} microsoftUserInfo - User info from Microsoft API
 * @param {Object} tokens - OAuth tokens from Microsoft
 * @returns {Object} Database user object
 */
export const handleMicrosoftUser = async (microsoftUserInfo, tokens) => {
  try {
    const { mail, displayName, id: microsoftId, userPrincipalName } = microsoftUserInfo;
    const { access_token,  id_token,expires_in } = tokens || {};
    // Use mail or userPrincipalName as email
    const email = mail || userPrincipalName;

    // Check if user exists
    let dbUser = await getUserByEmail(email,'microsoft');

    if (!dbUser) {
      // Create new user
      const userData = {
        username: displayName || email.split('@')[0],
        gmail: email,
        refresh_token:  id_token,
        Access_Token: access_token,
        expire_time: expires_in,
        type: 'microsoft_oauth'
      };

      dbUser = await createUser(userData, "microsoft");
      console.log(`✅ New Microsoft user created: ${dbUser.id}`);
      
      return {
        user: dbUser,
        isNewUser: true,
        microsoftInfo: {
          microsoftId,
          displayName,
          email
        }
      };
    } else {
      // Update existing user's tokens
      const updateData = {};
      if (id_token) updateData.refresh_token = id_token;
      if (access_token) updateData.access_token = access_token;

      if (Object.keys(updateData).length > 0) {
        dbUser = await updateUser(dbUser.id, updateData, 'microsoft');
        console.log(`✅ Updated tokens for user: ${dbUser.id}`);
      }

      return {
        user: dbUser,
        isNewUser: false,
        microsoftInfo: {
          microsoftId,
          displayName,
          email
        }
      };
    }
  } catch (error) {
    console.error("❌ Error handling Microsoft user:", error);
    throw error;
  }
};

/**
 * Generate user session data for Microsoft auth
 * @param {Object} dbUser - Database user object
 * @param {Object} microsoftInfo - Microsoft user information
 * @returns {Object} Session data
 */
export const generateMicrosoftUserSession = (dbUser, microsoftInfo) => {
  return {
    userId: dbUser.id,
    username: dbUser.username,
    email: dbUser.gmail,
    displayName: microsoftInfo.displayName,
    loginMethod: 'microsoft',
    loginTime: new Date().toISOString()
  };
};

/**
 * Validate Microsoft authentication response
 * @param {Object} userInfo - User info from Microsoft
 * @param {Object} tokens - OAuth tokens
 * @returns {boolean} Validation result
 */
export const validateMicrosoftAuth = (userInfo, tokens) => {
  const requiredUserFields = ['id', 'displayName'];
  const requiredTokens = ['access_token'];

  // Check user info
  for (const field of requiredUserFields) {
    if (!userInfo[field]) {
      throw new Error(`Missing required user field: ${field}`);
    }
  }

  // Check tokens (only for full OAuth flow)
  if (tokens) {
    for (const token of requiredTokens) {
      if (!tokens[token]) {
        throw new Error(`Missing required token: ${token}`);
      }
    }
  }

  // Validate email format (mail or userPrincipalName)
  const email = userInfo.mail || userInfo.userPrincipalName;
  if (!email) {
    throw new Error('No email found in Microsoft user info');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  return true;
};

/**
 * Handle Microsoft authentication errors
 * @param {Error} error - Error object
 * @param {Object} res - Express response object
 */
export const handleMicrosoftAuthError = (error, res) => {
  console.error("Microsoft authentication error:", error);

  // Database errors
  if (error.message.includes('email already exists')) {
    return res.status(409).json({
      status: "error",
      message: "User with this email already exists",
      code: "USER_EXISTS"
    });
  }

  // Validation errors
  if (error.message.includes('Missing required')) {
    return res.status(400).json({
      status: "error",
      message: error.message,
      code: "VALIDATION_ERROR"
    });
  }

  // Token errors
  if (error.message.includes('Invalid token') || error.message.includes('token')) {
    return res.status(401).json({
      status: "error",
      message: "Invalid authentication token",
      code: "INVALID_TOKEN"
    });
  }

  // Microsoft API errors
  if (error.message.includes('Microsoft')) {
    return res.status(502).json({
      status: "error",
      message: "Microsoft authentication service error",
      code: "MICROSOFT_API_ERROR"
    });
  }

  // Generic error
  return res.status(500).json({
    status: "error",
    message: "Authentication failed",
    code: "AUTH_FAILED"
  });
};