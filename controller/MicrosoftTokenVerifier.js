import axios from "axios";
import { 
  handleMicrosoftUser, 
  generateMicrosoftUserSession, 
  validateMicrosoftAuth, 
  handleMicrosoftAuthError 
} from "./MicrosoftAuthController.js";

import { createOAuthJWTResponse } from "./OAuthJWTIntegration.js";

/**
 * Verify Microsoft access token and handle user authentication
 * This is used for popup-based authentication where we receive an access token directly
 */
export const verifyMicrosoftToken = async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({
        status: "error",
        message: "No access token provided"
      });
    }

    console.log("🔄 Verifying Microsoft access token...");

    // Get user info from Microsoft Graph API using the access token
    const userInfoResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const microsoftUserInfo = userInfoResponse.data;
    console.log("✅ Retrieved user info from Microsoft Graph API");

    // Mock tokens object (since we only have access token)
    const tokens = {
      access_token: access_token,
      refresh_token: null,
      token_type: "Bearer"
    };

    // Validate user info (skip token validation since we only have access token)
    const requiredUserFields = ['id', 'displayName'];
    for (const field of requiredUserFields) {
      if (!microsoftUserInfo[field]) {
        throw new Error(`Missing required user field: ${field}`);
      }
    }

    // Validate email
    const email = microsoftUserInfo.mail || microsoftUserInfo.userPrincipalName;
    if (!email) {
      throw new Error('No email found in Microsoft user info');
    }

    // Handle user in database
    const { user: dbUser, isNewUser, microsoftInfo } = await handleMicrosoftUser(microsoftUserInfo, tokens);
    const sessionData = generateMicrosoftUserSession(dbUser, microsoftInfo);

    // Create OAuth response with JWT tokens
    const oauthResponse = createOAuthJWTResponse(
      dbUser, 
      isNewUser, 
      {
        microsoft_id: microsoftUserInfo.id,
        display_name: microsoftUserInfo.displayName,
        email: email,
        job_title: microsoftUserInfo.jobTitle,
        office_location: microsoftUserInfo.officeLocation
      }, 
      'microsoft'
    );

    res.json(oauthResponse);

    console.log(`✅ Microsoft token verification completed for user: ${dbUser.id}`);

  } catch (error) {
    console.error("❌ Microsoft token verification failed:", error);
    
    // Handle Microsoft Graph API errors
    if (error.response?.status === 401) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired Microsoft access token",
        code: "INVALID_TOKEN"
      });
    }
    
    if (error.response?.data) {
      console.error("Microsoft Graph API Error:", error.response.data);
    }
    
    return handleMicrosoftAuthError(error, res);
  }
};