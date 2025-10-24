import axios from "axios";
import { 
  handleMicrosoftUser, 
  generateMicrosoftUserSession, 
  validateMicrosoftAuth, 
  handleMicrosoftAuthError 
} from "../controller/MicrosoftAuthController.js";

// Microsoft OAuth 2.0 configuration
const MICROSOFT_CONFIG = {
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  redirectUri: process.env.MICROSOFT_REDIRECT_URL || "http://localhost:5000/api/microsoft/callback",
  scope: "openid profile email User.Read",
  authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  userInfoUrl: "https://graph.microsoft.com/v1.0/me"
};

/**
 * Generate Microsoft OAuth authorization URL
 */
export const Microsoft_Register = async (req, res) => {
  try {
    if (!MICROSOFT_CONFIG.clientId) {
      return res.status(500).json({
        status: "error",
        message: "Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID in environment variables."
      });
    }

    const authParams = new URLSearchParams({
      client_id: MICROSOFT_CONFIG.clientId,
      response_type: "code",
      redirect_uri: MICROSOFT_CONFIG.redirectUri,
      scope: MICROSOFT_CONFIG.scope,
      response_mode: "query",
      state: Math.random().toString(36).substring(7) // Simple state for CSRF protection
    });

    const authUrl = `${MICROSOFT_CONFIG.authUrl}?${authParams.toString()}`;

    res.json({
      status: "success",
      authUrl: authUrl,
      message: "Microsoft OAuth URL generated successfully"
    });

    console.log("✅ Microsoft OAuth URL generated");

  } catch (error) {
    console.error("❌ Error generating Microsoft auth URL:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate Microsoft authentication URL"
    });
  }
};

/**
 * Handle Microsoft OAuth callback
 */
export const MicrosoftCallback = async (req, res) => {
  try {
    const { code, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error("❌ Microsoft OAuth error:", error, error_description);
      return res.status(400).json({
        status: "error",
        message: error_description || "Microsoft authentication failed",
        code: error
      });
    }

    if (!code) {
      return res.status(400).json({
        status: "error",
        message: "Authorization code not provided"
      });
    }

    console.log("🔄 Processing Microsoft OAuth callback with code:", code.substring(0, 20) + "...");

    // Step 1: Exchange code for tokens
    const tokenResponse = await axios.post(MICROSOFT_CONFIG.tokenUrl, new URLSearchParams({
      client_id: MICROSOFT_CONFIG.clientId,
      client_secret: MICROSOFT_CONFIG.clientSecret,
      code: code,
      redirect_uri: MICROSOFT_CONFIG.redirectUri,
      grant_type: "authorization_code"
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const tokens = tokenResponse.data;
    console.log("✅ Successfully exchanged code for tokens");

    // Step 2: Get user info from Microsoft Graph API
    const userInfoResponse = await axios.get(MICROSOFT_CONFIG.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    const microsoftUserInfo = userInfoResponse.data;
    console.log("✅ Retrieved user info from Microsoft Graph API");

    // Step 3: Validate the authentication data
    validateMicrosoftAuth(microsoftUserInfo, tokens);

    // Step 4: Handle user in database (create or update)
    const { user: dbUser, isNewUser, microsoftInfo } = await handleMicrosoftUser(microsoftUserInfo, tokens);

    // Step 5: Generate session data
    const sessionData = generateMicrosoftUserSession(dbUser, microsoftInfo);

    // Step 6: Return comprehensive response
    res.json({
      status: "success",
      message: isNewUser ? "New user registered successfully" : "User logged in successfully",
      data: {
        user: {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.gmail,
          created_at: dbUser.created_at,
          isNewUser,
          tokens
        },
        microsoft_profile: {
          microsoft_id: microsoftUserInfo.id,
          display_name: microsoftUserInfo.displayName,
          email: microsoftUserInfo.mail || microsoftUserInfo.userPrincipalName,
          job_title: microsoftUserInfo.jobTitle,
          office_location: microsoftUserInfo.officeLocation
        },
        session: sessionData,
        tokens: {
          hasRefreshToken: !!tokens.refresh_token,
          hasAccessToken: !!tokens.access_token,
          tokenType: tokens.token_type,
          expiresIn: tokens.expires_in
        }
      }
    });

    console.log(`✅ Microsoft authentication completed for user: ${dbUser.id}`);

  } catch (error) {
    console.error("❌ Microsoft authentication failed:", error);
    
    // Handle specific Microsoft API errors
    if (error.response?.data) {
      console.error("Microsoft API Error:", error.response.data);
    }
    
    return handleMicrosoftAuthError(error, res);
  }
};