import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import axios from "axios";
import { 
  handleGoogleUser, 
  generateUserSession, 
  validateGoogleAuth, 
  handleAuthError 
} from "../controller/GoogleAuthController.js";

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
  console.log("Google credentials successfully loaded");
} catch (error) {
  console.error("Error while fetching Google credentials:", error);
  throw new Error("Failed to load Google credentials");
}

const client = new OAuth2Client(keys.web.client_id);

const verifyIdToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: keys.web.client_id,
    });
    return ticket.getPayload();
  } catch (error) {
    console.error("Token verification error:", error);
    throw new Error("Invalid token");
  }
};

const oauth2Client = new google.auth.OAuth2(
  keys.web.client_id,
  keys.web.client_secret,
  process.env.GOOGLE_REDIRECT_URL || "http://localhost:5000/api/google/callback"
);

export const User_Register = async (req, res) => {
  try {
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
    });

    res.json({
      status: "success",
      authUrl: authUrl,
    });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate authentication URL",
    });
  }
};

export const GoogleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        status: "error",
        message: "Authorization code not provided",
      });
    }

    console.log("🔄 Processing Google OAuth callback with code:", code.substring(0, 20) + "...");

    // Step 1: Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    const { access_token, id_token, refresh_token } = tokens;
    
    console.log("✅ Successfully exchanged code for tokens");

    // Step 2: Verify ID token and get user info
    let userPayload = null;
    if (id_token) {
      userPayload = await verifyIdToken(id_token);
      console.log("✅ ID token verified successfully");
    }

    // Step 3: Get detailed user info from Google API
    const userInfoResponse = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const googleUserInfo = userInfoResponse.data;
    console.log("✅ Retrieved user info from Google API");

    // Step 4: Validate the authentication data
    validateGoogleAuth(googleUserInfo, tokens);

    // Step 5: Handle user in database (create or update)
    const { user: dbUser, isNewUser, googleInfo } = await handleGoogleUser(googleUserInfo, tokens);

    // Step 6: Generate session data
    const sessionData = generateUserSession(dbUser, googleInfo);

    // Step 7: Return comprehensive response
    res.json({
      status: "success",
      message: isNewUser ? "New user registered successfully" : "User logged in successfully",
      data: {
        user: {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.gmail,
          created_at: dbUser.created_at,
          isNewUser
        },
        google_profile: {
          google_id: googleUserInfo.id,
          name: googleUserInfo.name,
          picture: googleUserInfo.picture,
          verified_email: googleUserInfo.verified_email,
          locale: googleUserInfo.locale
        },
        session: sessionData,
        tokens: {
          hasRefreshToken: !!refresh_token,
          hasAccessToken: !!access_token,
          tokenExpiry: tokens.expiry_date
        }
      }
    });

    console.log(`✅ Google authentication completed for user: ${dbUser.id}`);

  } catch (error) {
    console.error("❌ Google authentication failed:", error);
    return handleAuthError(error, res);
  }
};
