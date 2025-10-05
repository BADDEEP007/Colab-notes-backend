import authService from '../services/authService.js';
import emailService from '../services/emailService.js';
import jwt, { decode } from 'jsonwebtoken'
import { createUser, getUserByEmail, updateUser, getUserById } from '../postgresql/Postgresql.js';

/**
 * Register new user with email/password
 */
export const registerUser = async (req, res) => {
  try {
    const { username, gmail, password } = req.body;

    console.log(`🔄 Registration attempt for: ${gmail}`);

    // Check if user already exists
    const existingUser = await getUserByEmail(gmail,'users');
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await authService.hashPassword(password);
 console.log(1)
    const  newData = {
      username: username.trim(),
      gmail: gmail.toLowerCase().trim(),
      Hashed_password: hashedPassword,
      refresh_token :'',
      expire_time :"",
      type:"",

    
    }
    // Create user in database
    
    
    const newUser = await createUser(newData,'users');
    const tokens = authService.createTokenPair(newUser);
    console.log(tokens)

    // Generate JWT tokens
    // Update user with refresh token
    await updateUser(newUser.id, 
      { 
      refresh_token: tokens.refreshToken ,
      expire_time : tokens.expiresIn,
      type : tokens.tokenType
    },
    'users');

    // Send welcome email (don't wait for it)
    emailService.sendWelcomeEmail(gmail, username).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    // Generate session data
    res.cookie("accessToken", tokens.accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: "Strict",
  maxAge: 15 * 60 * 1000 // 15 minutes
});

res.cookie("refreshToken", tokens.refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: "Strict",
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
    console.log(`✅ User registered successfully: ${newUser.id}`);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.gmail,
          created_at: newUser.created_at
        },
        tokens,
        // session: sessionData
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      code: 'REGISTRATION_ERROR',
      error_mssg:error

    });
  }
};

/**
 * Login user with email/password
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`🔄 Login attempt for: ${email}`);

    // Find user by email
    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check password
    const isPasswordValid = await authService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate new JWT tokens
    const tokens = authService.createTokenPair(user);

    // Update user with new refresh token
    await updateUser(user.id, { 
      refreshtoken: tokens.refreshToken 
    });

    // Generate session data
    const sessionData = authService.generateSessionData(user, req);

    // Send login notification email (don't wait for it)
    const loginInfo = {
      timestamp: new Date().toLocaleString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      location: 'Unknown' // You can integrate with IP geolocation service
    };
    
    emailService.sendLoginNotificationEmail(user.gmail, user.username, loginInfo).catch(err => {
      console.error('Failed to send login notification:', err);
    });

    console.log(`✅ User logged in successfully: ${user.id}`);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.gmail,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        tokens,
        session: sessionData
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
};

/**
 * Refresh JWT tokens
 */
export const refreshTokens = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Verify refresh token
    const decoded = authService.verifyRefreshToken(refreshToken);

    // Get user from database
    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if refresh token matches the one in database
    if (user.refreshtoken !== refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new token pair
    const tokens = authService.createTokenPair(user);

    // Update user with new refresh token
    await updateUser(user.id, { 
      refreshtoken: tokens.refreshToken 
    });

    console.log(`✅ Tokens refreshed for user: ${user.id}`);

    res.json({
      status: 'success',
      message: 'Tokens refreshed successfully',
      data: {
        tokens
      }
    });

  } catch (error) {
    console.error('❌ Token refresh error:', error);
    
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      return res.status(401).json({
        status: 'error',
        message: error.message,
        code: 'REFRESH_TOKEN_ERROR'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
};

/**
 * Logout user (invalidate refresh token)
 */
export const logoutUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // Clear refresh token from database
    await updateUser(userId, { 
      refreshtoken: null 
    });

    console.log(`✅ User logged out: ${userId}`);

    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
};

/**
 * Request password reset
 */
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    console.log(`🔄 Password reset requested for: ${email}`);

    // Find user by email
    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        status: 'success',
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = authService.generateResetToken(user.id, user.gmail);

    // Store reset token in database (you might want to add a reset_token field)
    await updateUser(user.id, { 
      accesstoken: resetToken // Temporarily using accesstoken field for reset token
    });

    // Send password reset email
    const emailSent = await emailService.sendPasswordResetEmail(
      user.gmail, 
      user.username, 
      resetToken
    );

    if (!emailSent) {
      console.error('Failed to send password reset email');
    }

    console.log(`✅ Password reset email sent to: ${email}`);

    res.json({
      status: 'success',
      message: 'If an account with that email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('❌ Password reset request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Password reset request failed',
      code: 'RESET_REQUEST_ERROR'
    });
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Reset token and new password are required',
        code: 'MISSING_FIELDS'
      });
    }

    console.log(`🔄 Password reset attempt with token`);

    // Verify reset token
    const decoded = authService.verifyResetToken(token);

    // Find user
    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    }

    // Verify token matches the one in database
    if (user.accesstoken !== token) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    }

    // Hash new password
    const hashedPassword = await authService.hashPassword(newPassword);

    // Update user password and clear reset token
    await updateUser(user.id, { 
      password: hashedPassword,
      accesstoken: null, // Clear reset token
      refreshtoken: null // Invalidate all sessions
    });

    console.log(`✅ Password reset successful for user: ${user.id}`);

    res.json({
      status: 'success',
      message: 'Password reset successful. Please log in with your new password.'
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Password reset failed',
      code: 'RESET_ERROR'
    });
  }
};

/**
 * Recover username by email
 */
export const recoverUsername = async (req, res) => {
  try {
    const { email } = req.body;

    console.log(`🔄 Username recovery requested for: ${email}`);

    // Find user by email
    const user = await getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        status: 'success',
        message: 'If an account with that email exists, the username has been sent'
      });
    }

    // Send username recovery email
    const emailSent = await emailService.sendUsernameRecoveryEmail(
      user.gmail, 
      user.username
    );

    if (!emailSent) {
      console.error('Failed to send username recovery email');
    }

    console.log(`✅ Username recovery email sent to: ${email}`);

    res.json({
      status: 'success',
      message: 'If an account with that email exists, the username has been sent'
    });

  } catch (error) {
    console.error('❌ Username recovery error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Username recovery failed',
      code: 'USERNAME_RECOVERY_ERROR'
    });
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = req.user; // Set by authenticateToken middleware

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at
        }
      }
    });

  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get user profile',
      code: 'PROFILE_ERROR'
    });
  }
};

/**
 * Change password (authenticated user)
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Get user from database
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await authService.comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hash new password
    const hashedNewPassword = await authService.hashPassword(newPassword);

    // Update password and invalidate all sessions
    await updateUser(userId, { 
      password: hashedNewPassword,
      refreshtoken: null // Force re-login
    });

    console.log(`✅ Password changed for user: ${userId}`);

    res.json({
      status: 'success',
      message: 'Password changed successfully. Please log in again.'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Password change failed',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
};



export const Verify_gmail=async (req , res) =>{
 try {
    const { token } = req.query;
    const decoded =  await jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
    const result =  await getUserByEmail(decoded.gmail,'users');
    console.log(result)

    await updateUser( result.id , {verified : true}, 'users')


    res.send("✅ Email verified! You can now log in.");
  } catch (err) {
    console.log(err)
    res.status(400).send({mssg:"❌ Invalid or expired verification link.",
      error:err
    });
  }

}

export const SendVerificationmail = async (req,res )=>{
 const {username , gmail } = req.body;

  const payload = {
    gmail,
   username,
  };

  const token = jwt.sign(payload, process.env.EMAIL_VERIFICATION_SECRET, {
    expiresIn: "1h",
  })
try {
   emailService.sendVerificationEmail(gmail, username, token).catch(err => {
      console.error('Failed to send login notification:', err);
    });
     res.status(201).json({
      status: 'success',
      message: 'mail send successfully',
      data: {
       payload,
       token
      }
    });
  
} catch (error) {
      res.status(400).json({
        mssg:error,
        
      });

  
}


}