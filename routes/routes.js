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
  Verify_gmail
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

router.get("/api/notes/get", setHeaders("GET"), getallnotes);
router.get("/api/notes/get/title/:title", setHeaders("GET"), getNotebyTitle);
router.post("/api/notes/add", setHeaders("POST"), postnotes);
router.delete("/api/notes/delete", setHeaders("DELETE"), DeleteNotebyTitle);
router.put("/api/notes/update/:title", setHeaders("PUT"), updateNote);
router.post("/api/new_user/register", setHeaders("POST"), User_Register);
router.get("/api/google/callback", setHeaders("GET"), GoogleCallback);
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
  validateRequiredFields(["email", "password"]),
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
  validateRequiredFields(["email"]),
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
  validateRequiredFields(["email"]),
  validateEmail,
  recoverUsername
);

router.get(
  "/api/auth/me",
  setHeaders("GET"),
  authenticateToken,
  getCurrentUser
);

router.get(
  "/api/auth/verify",
  setHeaders("GET"),
  Verify_gmail
)

router.post(
  "/api/sendmail/verification",
  setHeaders('POST'),
  validateEmail,
  SendVerificationmail
)

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

router.get("/test/jwt-auth", (req, res) => {
  res.sendFile("auth-test.html", { root: "./public" });
});



export default router;
