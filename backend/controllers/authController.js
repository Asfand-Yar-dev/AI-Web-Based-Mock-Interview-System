/**
 * =============================================================================
 * AUTH CONTROLLER
 * =============================================================================
 * 
 * This controller handles all authentication-related business logic:
 * - User Registration (Signup) - Email/Password
 * - User Login - Email/Password
 * - Google Sign-In - OAuth 2.0
 * - Get Current User Profile
 * - Update User Profile
 * - Change Password
 * 
 * AUTHENTICATION METHODS:
 * 1. Local (Email/Password): Traditional registration and login
 * 2. Google OAuth: Sign in with Google using ID tokens
 * 
 * SECURITY FEATURES:
 * - Passwords are hashed using bcrypt before storage
 * - JWT tokens are used for session management
 * - Tokens expire after 24 hours (configurable)
 * - Passwords are never returned in API responses
 * - Google tokens are verified using Google's OAuth library
 * 
 * @author FYP Team
 * @version 1.1.0 (Added Google OAuth support)
 * =============================================================================
 */

const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { HTTP_STATUS, TOKEN_EXPIRY } = require('../config/constants');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Initialize Google OAuth2 Client
 * Uses the GOOGLE_CLIENT_ID from environment variables
 */
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * -----------------------------------------------------------------------------
 * HELPER FUNCTION: Generate JWT Token
 * -----------------------------------------------------------------------------
 * Creates a signed JWT token containing user information.
 * 
 * Token Payload:
 * - id: User's MongoDB ObjectId
 * - email: User's email address
 * - role: User's role (user/admin/interviewer)
 * 
 * @param {Object} user - The user object from database
 * @returns {string} Signed JWT token
 * -----------------------------------------------------------------------------
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.user_role,
      plan: user.plan || 'free',
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || TOKEN_EXPIRY.ACCESS }
  );
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Register New User
 * -----------------------------------------------------------------------------
 * Creates a new user account in the database.
 * 
 * PROCESS:
 * 1. Validate input (handled by validation middleware)
 * 2. Check if email already exists
 * 3. Hash password (handled automatically by User model pre-save hook)
 * 4. Save user to database
 * 5. Generate JWT token
 * 6. Return user data (without password) and token
 * 
 * @route   POST /api/users/register
 * @access  Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - User's full name (required)
 * @param {string} req.body.email - User's email address (required, unique)
 * @param {string} req.body.password - User's password (required, min 6 chars)
 * @param {string} [req.body.role] - User's role (optional, default: 'user')
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user data and token
 * 
 * @throws {ApiError} 409 - If email already exists
 * @throws {ApiError} 500 - If server error occurs
 * -----------------------------------------------------------------------------
 */
const register = async (req, res) => {
  // SECURITY: Only destructure and permit 'user' or 'interviewer' roles from req.body
  const { name, email, password, role } = req.body;

  // SECURITY: Only allow 'user' or 'interviewer'. High-privilege roles like 'admin' cannot be requested.
  const user_role = role === 'interviewer' ? 'interviewer' : 'user';

  // Step 1: Check if user with this email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    // An email is one identity — it can't own both a user and an interviewer account.
    // If the requested role differs from the existing one, say so explicitly so the user knows
    // whether to log in to their existing account or use a different email.
    const existingRole = existingUser.user_role;

    if (existingRole !== user_role) {
      const existingLabel = existingRole === 'interviewer' ? 'an interviewer'
        : existingRole === 'admin' ? 'an admin'
        : 'a candidate';
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `This email is already registered as ${existingLabel}. The same email can't be used for both a candidate and an interviewer — log in to your existing account or sign up with a different email${user_role === 'interviewer' ? ' to join as an interviewer' : ''}.`
      );
    }

    // Same role, just a duplicate signup attempt.
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      'An account with this email already exists. Please log in or use a different email.'
    );
  }
  const user = new User({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    user_role
  });

  // Step 3: Save user to database
  await user.save();

  if (user_role === 'interviewer') {
    try {
      const Interviewer = require('../models/Interviewer');
      await Interviewer.create({
        userId: user._id,
        hourlyRate: 0,
        isAcceptingBookings: false,
        bio: '',
        domains: [],
        skills: [],
        roles: [],
        availability: []
      });
      logger.info(`Auto-created skeleton interviewer profile for user ${user._id} on registration.`);
    } catch (err) {
      logger.error(`Failed to auto-create skeleton interviewer profile for user ${user._id} on registration: ${err.message}`);
    }
  }

  // Step 4: Generate JWT token for immediate login after registration
  const token = generateToken(user);

  // Step 5: Log the registration event
  logger.info(`New user registered: ${email} with role: ${user.user_role}`);

  // Step 6: Send success response
  // Note: toSafeObject() removes the password from the response
  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Registration successful! Welcome to AI Interview System.',
    data: {
      user: user.toSafeObject(),
      token
    }
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: User Login
 * -----------------------------------------------------------------------------
 * Authenticates a user and returns a JWT token.
 * 
 * PROCESS:
 * 1. Validate input (handled by validation middleware)
 * 2. Find user by email (including password field)
 * 3. Check if user account is active
 * 4. Compare provided password with hashed password
 * 5. Update last login timestamp
 * 6. Generate JWT token
 * 7. Return user data and token
 * 
 * SECURITY NOTES:
 * - Generic error message is returned for invalid credentials
 *   (doesn't reveal if email exists or password is wrong)
 * - Password comparison uses bcrypt's timing-safe comparison
 * 
 * @route   POST /api/users/login
 * @access  Public
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address (required)
 * @param {string} req.body.password - User's password (required)
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user data and token
 * 
 * @throws {ApiError} 401 - If credentials are invalid
 * @throws {ApiError} 401 - If account is deactivated
 * -----------------------------------------------------------------------------
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // Step 1: Find user by email
  // Note: We use findByEmail which includes the password field (normally excluded)
  const user = await User.findByEmail(email.toLowerCase());

  // Step 2: Check if user exists
  if (!user) {
    // Generic error message for security (doesn't reveal if email exists)
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid email or password. Please check your credentials.'
    );
  }

  // Step 3: Check if user account is active
  if (!user.isActive) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Your account has been deactivated. Please contact support.'
    );
  }

  // Step 4: Compare passwords using bcrypt
  // comparePassword is a method defined in User model that uses bcrypt.compare()
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    // Generic error message for security
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid email or password. Please check your credentials.'
    );
  }

  // Step 5: Update last login timestamp
  user.lastLogin = new Date();
  await user.save();

  // Step 6: Generate JWT token
  const token = generateToken(user);

  // Step 7: Log the login event
  logger.info(`User logged in: ${email}`);

  // Step 8: Send success response
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Login successful! Welcome back.',
    data: {
      user: user.toSafeObject(),
      token
    }
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Get Current User Profile
 * -----------------------------------------------------------------------------
 * Retrieves the profile of the currently authenticated user.
 * 
 * NOTE: This is a protected route - requires valid JWT token
 * The user ID is extracted from the token by auth middleware
 * 
 * @route   GET /api/users/me
 * @access  Private (requires authentication)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - User data from JWT (added by auth middleware)
 * @param {string} req.user.id - User's MongoDB ObjectId
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with user profile data
 * 
 * @throws {ApiError} 404 - If user not found
 * -----------------------------------------------------------------------------
 */
const getProfile = async (req, res) => {
  // req.user is set by the authenticate middleware from JWT payload
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User account not found.');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: user.toSafeObject()
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Update User Profile
 * -----------------------------------------------------------------------------
 * Updates the profile of the currently authenticated user.
 * 
 * ALLOWED UPDATES:
 * - name: User's full name
 * 
 * NOT ALLOWED:
 * - email: Cannot be changed (used as identifier)
 * - password: Use change-password endpoint instead
 * - role: Only admin can change roles
 * 
 * @route   PUT /api/users/me
 * @access  Private (requires authentication)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} [req.body.name] - New name for user
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response with updated user data
 * 
 * @throws {ApiError} 404 - If user not found
 * -----------------------------------------------------------------------------
 */
const updateProfile = async (req, res) => {
  const { name } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User account not found.');
  }

  // Only update allowed fields
  if (name && name.trim()) {
    user.name = name.trim();
  }

  await user.save();

  logger.info(`Profile updated for user: ${user.email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Profile updated successfully.',
    data: user.toSafeObject()
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Change Password
 * -----------------------------------------------------------------------------
 * Allows authenticated users to change their password.
 * 
 * SECURITY:
 * - Requires current password for verification
 * - New password must meet minimum length requirements
 * - New password is automatically hashed before storage
 * 
 * @route   PUT /api/users/change-password
 * @access  Private (requires authentication)
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.currentPassword - Current password for verification
 * @param {string} req.body.newPassword - New password (min 6 characters)
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response confirming password change
 * 
 * @throws {ApiError} 400 - If required fields missing
 * @throws {ApiError} 401 - If current password is incorrect
 * @throws {ApiError} 404 - If user not found
 * -----------------------------------------------------------------------------
 */
/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Set Password (first-time)
 * -----------------------------------------------------------------------------
 * Lets a user who has no password yet (typically a Google OAuth user) set one
 * so they can also log in with email + password.
 *
 * @route   POST /api/users/set-password
 * @access  Private
 * -----------------------------------------------------------------------------
 */
const setPassword = async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'New password is required.');
  }
  if (newPassword.length < 6) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'New password must be at least 6 characters long.'
    );
  }

  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User account not found.');
  }

  if (user.password) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      'A password is already set for this account. Use change password instead.'
    );
  }

  user.password = newPassword;
  await user.save();

  logger.info(`Password set for user: ${user.email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password set successfully. You can now log in with email and password.',
    data: { user: user.toSafeObject() },
  });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validate required fields
  if (!currentPassword || !newPassword) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Both current password and new password are required.'
    );
  }

  // Validate new password length
  if (newPassword.length < 6) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'New password must be at least 6 characters long.'
    );
  }

  // Get user with password field
  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User account not found.');
  }

  // Verify current password
  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Current password is incorrect. Please try again.'
    );
  }

  // Reject if new password matches the current one
  const isSameAsCurrent = await user.comparePassword(newPassword);
  if (isSameAsCurrent) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'New password must be different from your current password.'
    );
  }

  // Update password (will be hashed by pre-save middleware)
  user.password = newPassword;
  await user.save();

  logger.info(`Password changed for user: ${user.email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password changed successfully. Please use your new password for future logins.'
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Verify Token
 * -----------------------------------------------------------------------------
 * Verifies if the provided JWT token is valid.
 * Useful for frontend to check if user is still logged in.
 * 
 * @route   GET /api/users/verify-token
 * @access  Private (requires authentication)
 * 
/**
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * 
 * @returns {Object} JSON response confirming token validity
 * -----------------------------------------------------------------------------
 */
const verifyToken = async (req, res) => {
  // If we reach here, the JWT itself is valid and unexpired (auth middleware
  // already verified signature + expiry). The only remaining checks are about
  // the account the token points to — so give distinct, accurate messages
  // instead of a misleading "token expired".
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'This account no longer exists. Please sign up or log in again.'
    );
  }

  if (!user.isActive) {
    throw new ApiError(
      HTTP_STATUS.FORBIDDEN,
      'This account has been deactivated. Please contact support.'
    );
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Token is valid.',
    data: {
      user: user.toSafeObject()
    }
  });
};

/**
 * =============================================================================
 * GOOGLE OAUTH AUTHENTICATION
 * =============================================================================
 */

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Google Sign-In
 * -----------------------------------------------------------------------------
 * Authenticates a user using Google OAuth 2.0 ID token.
 * 
 * HOW IT WORKS:
 * 1. Frontend uses Google Sign-In button to get an ID token from Google
 * 2. Frontend sends this ID token to this endpoint
 * 3. Backend verifies the token with Google's servers
 * 4. If valid, extracts user info (email, name, picture)
 * 5. Finds existing user or creates new user in database
 * 6. Issues our own JWT token for subsequent API calls
 * 
 * @route   POST /api/users/google
 * @access  Public
 * -----------------------------------------------------------------------------
 */
const googleSignIn = async (req, res) => {
  const { idToken, accessToken, authCode, role } = req.body;

  // Step 1: Validate that at least one token is provided
  if (!idToken && !accessToken && !authCode) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Google token is required. Please provide idToken, accessToken, or authCode from Google Sign-In.'
    );
  }

  // SECURITY: Only allow 'user' or 'interviewer' from the client.
  // null = login mode (no role-conflict check).
  const requestedRole = role === 'interviewer' ? 'interviewer'
    : role === 'user' ? 'user'
    : null;

  // Step 2: Verify the Google token and get user info
  let googleProfile;

  try {
    if (idToken) {
      const ticket = await googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      googleProfile = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || 'Google User',
        picture: payload.picture
      };

    } else if (authCode) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: authCode,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: 'postmessage',
          grant_type: 'authorization_code'
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        logger.error(`Google token exchange failed: ${JSON.stringify(errorData)}`);
        throw new Error('Failed to exchange authorization code');
      }

      const tokens = await tokenResponse.json();

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google');
      }

      const userInfo = await userInfoResponse.json();
      googleProfile = {
        googleId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || 'Google User',
        picture: userInfo.picture
      };

    } else if (accessToken) {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google');
      }

      const userInfo = await userInfoResponse.json();
      googleProfile = {
        googleId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || 'Google User',
        picture: userInfo.picture
      };
    }

  } catch (error) {
    logger.error(`Google token verification failed: ${error.message}`);

    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid or expired Google token. Please try signing in again.'
    );
  }

  logger.info(`Google Sign-In attempt for: ${googleProfile.email}`);

  // Step 3: Find or create user in our database
  const result = await User.findOrCreateFromGoogle(googleProfile, requestedRole);

  // Role-conflict: existing account has a different role than the one being signed up for.
  if (result.conflict) {
    const existingLabel = result.existingRole === 'interviewer' ? 'an interviewer'
      : result.existingRole === 'admin' ? 'an admin'
      : 'a candidate';
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      `This Google account is already registered as ${existingLabel}. The same email can't be used for both a candidate and an interviewer — sign in to your existing account, or use a different Google account to join as ${requestedRole === 'interviewer' ? 'an interviewer' : 'a candidate'}.`
    );
  }

  const { user, isNewUser } = result;

  if (!user.isActive) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      'Your account has been deactivated. Please contact support.'
    );
  }

  // Brand-new Google interviewer → auto-create their skeleton interviewer profile,
  // mirroring the local-register flow so the interviewer dashboard has something to load.
  if (isNewUser && user.user_role === 'interviewer') {
    try {
      const Interviewer = require('../models/Interviewer');
      await Interviewer.create({
        userId: user._id,
        hourlyRate: 0,
        isAcceptingBookings: false,
        bio: '',
        domains: [],
        skills: [],
        roles: [],
        availability: [],
      });
      logger.info(`Auto-created skeleton interviewer profile for Google user ${user._id}.`);
    } catch (err) {
      logger.error(`Failed to auto-create skeleton interviewer profile for Google user ${user._id}: ${err.message}`);
    }
  }

  // Step 5: Generate our own JWT token
  const token = generateToken(user);

  if (isNewUser) {
    logger.info(`New user registered via Google: ${googleProfile.email} as ${user.user_role}`);
  } else {
    logger.info(`User logged in via Google: ${googleProfile.email}`);
  }

  res.status(isNewUser ? HTTP_STATUS.CREATED : HTTP_STATUS.OK).json({
    success: true,
    message: isNewUser
      ? 'Account created successfully with Google! Welcome to AI Interview System.'
      : 'Google sign-in successful! Welcome back.',
    data: {
      user: user.toSafeObject(),
      token,
      isNewUser,
      authProvider: 'google'
    }
  });
};

/**
 * =============================================================================
 * MISSING PHASE 2 ENDPOINTS — ADDED PER ARCHITECTURE DOCUMENT
 * =============================================================================
 */

/**
 * -----------------------------------------------------------------------------
 * HELPER: Generate Refresh Token
 * -----------------------------------------------------------------------------
 * Creates a longer-lived refresh token for token rotation.
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || TOKEN_EXPIRY.REFRESH }
  );
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Logout
 * -----------------------------------------------------------------------------
 * Invalidates the user's refresh token.
 * 
 * NOTE: JWTs are stateless and cannot truly be "invalidated" server-side
 * without a token blacklist (Redis). This endpoint clears the refresh token
 * so the user cannot get new access tokens.
 * 
 * @route   POST /api/users/logout
 * @access  Private
 * -----------------------------------------------------------------------------
 */
const logout = async (req, res) => {
  const user = await User.findById(req.user.id).select('+refreshToken');

  if (user) {
    user.refreshToken = null;
    await user.save();
  }

  logger.info(`User logged out: ${req.user.email || req.user.id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Refresh Token
 * -----------------------------------------------------------------------------
 * Issues a new access token using a valid refresh token.
 * Implements token rotation: old refresh token is invalidated.
 * 
 * @route   POST /api/users/refresh-token
 * @access  Public (but requires valid refresh token in body)
 * -----------------------------------------------------------------------------
 */
const refreshTokenHandler = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Refresh token is required.');
  }

  // Verify the refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired refresh token. Please log in again.');
  }

  // Ensure it's actually a refresh token
  if (decoded.type !== 'refresh') {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid token type.');
  }

  // Find the user and verify the stored refresh token matches
  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || !user.isActive) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'User not found or account deactivated.');
  }

  if (user.refreshToken !== refreshToken) {
    // Token rotation: if someone uses an old refresh token, it may be stolen
    // Invalidate ALL tokens for safety
    user.refreshToken = null;
    await user.save();
    logger.warn(`Possible token theft detected for user: ${user.email}`);
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Refresh token has been revoked. Please log in again.');
  }

  // Generate new token pair (token rotation)
  const newAccessToken = generateToken(user);
  const newRefreshToken = generateRefreshToken(user);

  // Store new refresh token (invalidates old one)
  user.refreshToken = newRefreshToken;
  await user.save();

  logger.info(`Token refreshed for user: ${user.email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Token refreshed successfully.',
    data: {
      token: newAccessToken,
      refreshToken: newRefreshToken
    }
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Forgot Password
 * -----------------------------------------------------------------------------
 * Generates a 6-digit one-time code (OTP), stores its hash, and emails it to
 * the user. The user then enters the OTP to unlock the new-password step
 * (see verifyResetOtp + resetPassword).
 *
 * @route   POST /api/users/forgot-password
 * @access  Public
 * -----------------------------------------------------------------------------
 */
const crypto = require('crypto');
const { sendPasswordResetOtp } = require('../config/email');

// Hash an OTP/token the same way before storing or comparing.
const hashResetCode = (code) =>
  crypto.createHash('sha256').update(String(code)).digest('hex');

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email address is required.');
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal whether email exists — always return success
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'If an account with that email exists, a verification code has been sent.'
    });
  }

  // Block reset only when no password has been set (pure Google account).
  // Google users who added a password via /set-password can still reset.
  if (!user.hasPassword) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'No password is set for this account. Sign in with Google and set a password in Settings first.'
    );
  }

  // Generate a 6-digit OTP (100000–999999)
  const otp = crypto.randomInt(100000, 1000000).toString();

  // Store only the hash of the OTP + expiry (10 minutes)
  user.passwordResetToken = hashResetCode(otp);
  user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  // Send the OTP via email (falls back to console-log in dev — see config/email.js)
  try {
    await sendPasswordResetOtp(user.email, user.name, otp);
  } catch (err) {
    logger.error(`Failed to send password reset OTP to ${user.email}: ${err.message}`);
    throw new ApiError(
      HTTP_STATUS.INTERNAL_ERROR,
      'We could not send the verification code right now. Please try again in a moment.'
    );
  }

  logger.info(`Password reset OTP sent to: ${email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'If an account with that email exists, a verification code has been sent.'
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Verify Reset OTP
 * -----------------------------------------------------------------------------
 * Checks that the supplied OTP matches and hasn't expired. Used by the frontend
 * to "unlock" the new-password step without consuming the code, so the user can
 * see the password fields only after a valid code is entered.
 *
 * @route   POST /api/users/verify-reset-otp
 * @access  Public
 * -----------------------------------------------------------------------------
 */
const verifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Email and verification code are required.');
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    passwordResetToken: hashResetCode(otp),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Invalid or expired verification code. Please check the code or request a new one.'
    );
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Code verified. You can now set a new password.'
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Reset Password
 * -----------------------------------------------------------------------------
 * Resets the user's password using the OTP emailed by forgotPassword.
 *
 * @route   POST /api/users/reset-password
 * @access  Public (but requires a valid, unexpired OTP)
 * -----------------------------------------------------------------------------
 */
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Email, verification code and new password are required.'
    );
  }

  if (newPassword.length < 6) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'New password must be at least 6 characters long.');
  }

  // Find user with matching OTP hash that hasn't expired
  const user = await User.findOne({
    email: email.toLowerCase(),
    passwordResetToken: hashResetCode(otp),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Invalid or expired verification code. Please request a new one.'
    );
  }

  // Update password (pre-save hook will hash it) and clear the OTP
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  logger.info(`Password reset completed for: ${user.email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Password has been reset successfully. You can now log in with your new password.'
  });
};

/**
 * -----------------------------------------------------------------------------
 * CONTROLLER: Update User Settings
 * -----------------------------------------------------------------------------
 * Updates the user's notification preferences.
 * 
 * @route   PATCH /api/users/settings
 * @access  Private
 * -----------------------------------------------------------------------------
 */
const updateSettings = async (req, res) => {
  const { emailNotifications, interviewReminders, resultNotifications } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User account not found.');
  }

  // Only update fields that are explicitly provided
  if (emailNotifications !== undefined) {
    user.settings.emailNotifications = Boolean(emailNotifications);
  }
  if (interviewReminders !== undefined) {
    user.settings.interviewReminders = Boolean(interviewReminders);
  }
  if (resultNotifications !== undefined) {
    user.settings.resultNotifications = Boolean(resultNotifications);
  }

  await user.save();

  logger.info(`Settings updated for user: ${user.email}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Settings updated successfully.',
    data: { settings: user.settings }
  });
};

// Export all controller functions
module.exports = {
  register,
  login,
  googleSignIn,
  getProfile,
  updateProfile,
  changePassword,
  setPassword,
  verifyToken,
  // Phase 2 additions:
  logout,
  refreshToken: refreshTokenHandler,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  updateSettings,
};

