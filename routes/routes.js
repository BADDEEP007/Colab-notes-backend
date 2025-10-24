import { Router } from "express";
import {
  getallnotes,
  postnotes,
  DeleteNotebyTitle,
  getNotebyTitle,
  updateNote,
} from "../controller/mainApiFunction.js";
import { setHeaders } from "../middleware/HelperApiFunction.js";
import {
  User_Register,
  GoogleCallback,
} from "../user_login/google_register.js";

import { verifyGoogleToken } from "../controller/GoogleTokenVerifier.js";

import {
  Microsoft_Register,
  MicrosoftCallback,
} from "../user_login/microsoft_register.js";

import { verifyMicrosoftToken } from "../controller/MicrosoftTokenVerifier.js";

import {


  UserEntry,
  Getallusers,
  Updateuser,
  GetUserbyid,
  GetUserbymail,
  Deleteuser,
} from "../controller/DatabaseApifunction.js";

// JWT Authentication imports
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  recoverUsername,
  getCurrentUser,
  changePassword,
  SendVerificationmail,
  Verify_gmail,
} from "../controller/authController.js";

import {
  authenticateToken,
  validateRequiredFields,
  validateEmail,
  validatePassword,
  rateLimitAuth,
  logAuthEvent,
} from "../middleware/authMiddleware.js";
import { validate } from "uuid";

const router = Router();

// Notes API - Protected with JWT authentication
router.get("/api/notes/get", setHeaders("GET"), authenticateToken, getallnotes);
router.get("/api/notes/get/title/:title", setHeaders("GET"), authenticateToken, getNotebyTitle);
router.post("/api/notes/add", setHeaders("POST"), authenticateToken, validateRequiredFields(["title", "content"]), postnotes);
router.delete("/api/notes/delete", setHeaders("DELETE"), authenticateToken, DeleteNotebyTitle);
router.put("/api/notes/update/:title", setHeaders("PUT"), authenticateToken, updateNote);


// Google auth
router.post("/api/google/register", setHeaders("POST"), User_Register);
router.get("/api/google/callback", setHeaders("GET"), GoogleCallback);
router.post("/api/google/verify-token", setHeaders("POST"), verifyGoogleToken);

// Microsoft auth
router.post("/api/microsoft/register", setHeaders("POST"), Microsoft_Register);
router.get("/api/microsoft/callback", setHeaders("GET"), MicrosoftCallback);
router.post("/api/microsoft/verify-token", setHeaders("POST"), verifyMicrosoftToken);
// JWT Authentication Routes
router.post(
  "/api/auth/register",
  setHeaders("POST"),
  rateLimitAuth(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  logAuthEvent("REGISTER"),
  validateRequiredFields(["username", "gmail", "password"]),
  validateEmail,
  validatePassword,
  registerUser
);

router.post(
  "/api/auth/login",
  setHeaders("POST"),
  rateLimitAuth(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  logAuthEvent("LOGIN"),
  validateRequiredFields(["gmail", "password"]),
  validateEmail,
  loginUser
);

router.post(
  "/api/auth/refresh",
  setHeaders("POST"),
  validateRequiredFields(["refreshToken"]),
  refreshTokens
);

router.post(
  "/api/auth/logout",
  setHeaders("POST"),
  authenticateToken,
  logAuthEvent("LOGOUT"),
  logoutUser
);

router.post(
  "/api/auth/forgot-password",
  setHeaders("POST"),
  rateLimitAuth(3, 60 * 60 * 1000), // 3 attempts per hour
  logAuthEvent("FORGOT_PASSWORD"),
  validateRequiredFields(["gmail"]),
  validateEmail,
  requestPasswordReset
);

router.post(
  "/api/auth/reset-password",
  setHeaders("POST"),
  rateLimitAuth(3, 60 * 60 * 1000), // 3 attempts per hour
  logAuthEvent("RESET_PASSWORD"),
  validateRequiredFields(["token", "newPassword"]),
  validatePassword,
  resetPassword
);

router.post(
  "/api/auth/recover-username",
  setHeaders("POST"),
  rateLimitAuth(3, 60 * 60 * 1000), // 3 attempts per hour
  logAuthEvent("RECOVER_USERNAME"),
  validateRequiredFields(["gmail"]),
  validateEmail,
  recoverUsername
);

router.get(
  "/api/auth/me",
  setHeaders("GET"),
  authenticateToken,
  getCurrentUser
);

router.get("/api/auth/verify", setHeaders("GET"), Verify_gmail);

router.post(
  "/api/sendmail/verification",
  setHeaders("POST"),
  validateEmail,
  SendVerificationmail
);

router.post(
  "/api/auth/change-password",
  setHeaders("POST"),
  authenticateToken,
  logAuthEvent("CHANGE_PASSWORD"),
  validateRequiredFields(["currentPassword", "newPassword"]),
  validatePassword,
  changePassword
);

// User Management Routes (PostgreSQL)
router.post("/api/database/users", setHeaders("POST"), UserEntry);
router.get("/api/database/users", setHeaders("GET"), Getallusers);
router.get("/api/database/users/id", setHeaders("GET"), GetUserbyid);
router.get("/api/database/users/mail", setHeaders("GET"), GetUserbymail);
router.put("/api/database/users/:id", setHeaders("PUT"), Updateuser);
router.delete("/api/database/users/delete", setHeaders("DELETE"), Deleteuser);

// Test pages
router.get("/test/google-auth", (req, res) => {
  res.sendFile("google-auth-test.html", { root: "./public" });
});

router.get("/test/google-popup", (req, res) => {
  res.sendFile("google-popup-signin.html", { root: "./public" });
});

router.get("/test/microsoft-popup", (req, res) => {
  res.sendFile("microsoft-popup-signin.html", { root: "./public" });
});

router.get("/test/oauth-comparison", (req, res) => {
  res.sendFile("oauth-comparison.html", { root: "./public" });
});

router.get("/test/notes-api", (req, res) => {
  res.sendFile("notes-api-test.html", { root: "./public" });
});

router.get("/test/oauth-jwt", (req, res) => {
  res.sendFile("oauth-jwt-integration.html", { root: "./public" });
});

router.get("/test/jwt-complete", (req, res) => {
  res.sendFile("jwt-auth-complete-test.html", { root: "./public" });
});

router.get("/test/jwt-auth", (req, res) => {
  res.sendFile("auth-test.html", { root: "./public" });
});

export default router;
