import { OAuth2Client } from "google-auth-library";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import { 
  handleGoogleUser, 
  generateUserSession, 
  validateGoogleAuth, 
  handleAuthError 
} from "./GoogleAuthController.js";

import { createOAuthJWTResponse } from "./OAuthJWTIntegration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let keys;
try {
  keys = JSON.parse(
    readFileSync(
      join(__dirname, "../credentials/colab_notes_user_login_google.json"),
      "utf8"
    )
  );
} catch (error) {
  console.error("Error loading Google credentials:", error);
  throw new Error("Failed to load Google credentials");
}

const client = new OAuth2Client(keys.web.client_id);

export const verifyGoogleToken = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        status: "error",
        message: "No credential provided"
      });
    }

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: keys.web.client_id,
    });

    const payload = ticket.getPayload();
    
    // Convert payload to expected format
    const googleUserInfo = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      verified_email: payload.email_verified
    };

    // Mock tokens object (since we only have ID token)
    const tokens = {
      access_token: null, // Not available with this method
      id_token: credential,
      refresh_token: null
    };

    // For popup signin, we only validate user info (no access token available)
    const requiredUserFields = ['email', 'name', 'id'];
    for (const field of requiredUserFields) {
      if (!googleUserInfo[field]) {
        throw new Error(`Missing required user field: ${field}`);
      }
    }
    
    const { user: dbUser, isNewUser, googleInfo } = await handleGoogleUser(googleUserInfo, tokens);
    const sessionData = generateUserSession(dbUser, googleInfo);

    // Create OAuth response with JWT tokens
    const oauthResponse = createOAuthJWTResponse(
      dbUser, 
      isNewUser, 
      {
        google_id: googleUserInfo.id,
        name: googleUserInfo.name,
        picture: googleUserInfo.picture,
        verified_email: googleUserInfo.verified_email
      }, 
      'google'
    );

    res.json(oauthResponse);

  } catch (error) {
    console.error("Token verification failed:", error);
    return handleAuthError(error, res);
  }
};