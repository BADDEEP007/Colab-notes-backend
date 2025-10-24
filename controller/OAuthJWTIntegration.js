import authService from '../services/authService.js';

/**
 * Generate JWT tokens for OAuth authenticated users
 * @param {Object} dbUser - Database user object
 * @param {string} provider - OAuth provider ('google' or 'microsoft')
 * @returns {Object} JWT tokens and user data
 */
export const generateOAuthJWTTokens = (dbUser, provider) => {
  try {
    // Generate JWT tokens
    const accessToken = authService.generateAccessToken({
      userId: dbUser.id,
      email: dbUser.gmail,
      username: dbUser.username,
      loginMethod: provider
    });

    const refreshToken = authService.generateRefreshToken({
      userId: dbUser.id,
      email: dbUser.gmail
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: '7d',
      user: {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.gmail,
        created_at: dbUser.created_at
      }
    };
  } catch (error) {
    console.error('❌ Error generating OAuth JWT tokens:', error);
    throw error;
  }
};

/**
 * Enhanced OAuth response with JWT tokens
 * @param {Object} dbUser - Database user object
 * @param {boolean} isNewUser - Whether this is a new user
 * @param {Object} providerInfo - Provider-specific user info
 * @param {string} provider - OAuth provider name
 * @returns {Object} Complete OAuth response with JWT tokens
 */
export const createOAuthJWTResponse = (dbUser, isNewUser, providerInfo, provider) => {
  const jwtTokens = generateOAuthJWTTokens(dbUser, provider);
  
  return {
    status: "success",
    message: isNewUser ? "New user registered successfully" : "User logged in successfully",
    data: {
      // JWT Authentication data
      auth: {
        accessToken: jwtTokens.accessToken,
        refreshToken: jwtTokens.refreshToken,
        tokenType: jwtTokens.tokenType,
        expiresIn: jwtTokens.expiresIn
      },
      // User information
      user: {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.gmail,
        created_at: dbUser.created_at,
        isNewUser,
        loginMethod: provider
      },
      // Provider-specific profile data
      profile: providerInfo,
      // Session information
      session: {
        userId: dbUser.id,
        username: dbUser.username,
        email: dbUser.gmail,
        loginMethod: provider,
        loginTime: new Date().toISOString()
      }
    }
  };
};