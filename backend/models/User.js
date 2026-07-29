/**
 * =============================================================================
 * USER MODEL
 * =============================================================================
 * 
 * Handles user data with secure password hashing.
 * Supports both email/password authentication AND Google OAuth.
 * 
 * AUTHENTICATION PROVIDERS:
 * - 'local': Traditional email/password registration
 * - 'google': Google Sign-In (OAuth 2.0)
 * 
 * @author FYP Team
 * @version 1.1.0 (Added Google OAuth support)
 * =============================================================================
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, USER_PLANS } = require('../config/constants');

/**
 * Authentication Provider Types
 * Used to identify how the user registered/logs in
 */
const AUTH_PROVIDERS = {
  LOCAL: 'local',   // Email/password
  GOOGLE: 'google'  // Google OAuth
};

const UserSchema = new mongoose.Schema({
  // ========================
  // BASIC USER INFORMATION
  // ========================
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },

  // ========================
  // AUTHENTICATION FIELDS
  // ========================

  /**
   * Password field - only required for 'local' auth provider
   * For Google OAuth users, this will be undefined
   */
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't include password in queries by default
    required: function () {
      // Password is only required for local authentication
      return this.authProvider === AUTH_PROVIDERS.LOCAL;
    }
  },

  /**
   * Authentication Provider
   * Identifies how the user was registered
   * - 'local': Email and password registration
   * - 'google': Google Sign-In
   */
  authProvider: {
    type: String,
    enum: Object.values(AUTH_PROVIDERS),
    default: AUTH_PROVIDERS.LOCAL
  },

  /**
   * Google OAuth specific fields
   * Only populated for users who signed in with Google
   */
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values while maintaining uniqueness for non-null
  },

  /**
   * Profile picture URL
   * Typically populated from Google profile for OAuth users
   */
  profilePicture: {
    type: String,
    default: null
  },

  // ========================
  // USER ROLE & STATUS
  // ========================
  user_role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.USER
  },

  isActive: {
    type: Boolean,
    default: true
  },

  /**
   * Email verification status
   * Google OAuth users are automatically verified
   */
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  /**
   * Whether the user has set a password (independent of authProvider).
   * Lets Google users add a password later and use email+password too.
   * Maintained by the pre-save hook whenever password is modified.
   */
  hasPassword: {
    type: Boolean,
    default: false,
  },

  lastLogin: {
    type: Date
  },

  // Architecture Doc Section 5.1: Notification preferences
  settings: {
    emailNotifications: { type: Boolean, default: true },
    interviewReminders: { type: Boolean, default: true },
    resultNotifications: { type: Boolean, default: true },
  },

  // Phase 2: Refresh token for token rotation
  refreshToken: {
    type: String,
    select: false, // Don't include in queries by default
  },

  // Phase 2: Forgot/Reset password flow
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetExpires: {
    type: Date,
    select: false,
  },

  // Email verification (OTP) flow — a 6-digit code is emailed at sign-up and the
  // account stays unverified (and cannot log in with email/password) until it's entered.
  emailVerificationToken: {
    type: String,
    select: false,
  },
  emailVerificationExpires: {
    type: Date,
    select: false,
  },

  // ── Plan / Subscription ──────────────────────────────────────────────────────
  /**
   * 'free' — limited to PLAN_LIMITS.FREE_MONTHLY_SESSIONS sessions/month,
   *           easy/medium difficulty only, no live interviews.
   * 'pro'  — unlimited sessions, all difficulties, live interview access.
   */
  plan: {
    type:    String,
    enum:    Object.values(USER_PLANS),
    default: USER_PLANS.FREE,
  },

  /** Timestamp when the current plan was activated (used for monthly reset logic). */
  planActivatedAt: {
    type:    Date,
    default: null,
  },
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Pre-save middleware to hash password
 * Only hashes if password is modified and auth provider is 'local'
 */
UserSchema.pre('save', async function () {
  // Hash the password whenever it's modified and present.
  // (Google users can now set a password too, so don't gate on authProvider.)
  if (!this.isModified('password') || !this.password) {
    return;
  }

  try {
    // Architecture doc specifies bcrypt cost 12+
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    this.hasPassword = true;
  } catch (error) {
    throw error; // In async hooks, throwing an error is equivalent to next(error)
  }
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * Compare provided password with stored hashed password
 * 
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} - True if passwords match
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  // No password set (e.g. Google user who hasn't added one yet).
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Get user data without sensitive fields
 * Safe to send in API responses
 * 
 * @returns {Object} - User object without password and internal fields
 */
UserSchema.methods.toSafeObject = function () {
  const userObject = this.toObject();
  // Derived: local users always have a password (schema requires it).
  // For Google users, fall back to the stored flag.
  userObject.hasPassword =
    userObject.hasPassword === true || this.authProvider === AUTH_PROVIDERS.LOCAL;
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * Find user by email (including password for authentication)
 * Used for local (email/password) login
 * 
 * @param {string} email - User's email address
 * @returns {Promise<User>} - User document with password field
 */
UserSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

/**
 * Find user by Google ID
 * Used for Google OAuth login
 * 
 * @param {string} googleId - Google's unique user ID
 * @returns {Promise<User>} - User document
 */
UserSchema.statics.findByGoogleId = function (googleId) {
  return this.findOne({ googleId });
};

/**
 * Find or create user from Google profile
 * If user exists, updates their info. If not, creates new user.
 * 
 * @param {Object} googleProfile - Google user profile data
 * @param {string} googleProfile.googleId - Google's unique user ID
 * @param {string} googleProfile.email - User's email from Google
 * @param {string} googleProfile.name - User's name from Google
 * @param {string} googleProfile.picture - Profile picture URL
 * @returns {Promise<{user: User, isNewUser: boolean}>}
 */
UserSchema.statics.findOrCreateFromGoogle = async function (googleProfile, requestedRole) {
  const { googleId, email, name, picture } = googleProfile;

  // Normalize and validate the requested role (only relevant for signup mode).
  // Login mode passes nothing; in that case we skip the role-conflict check.
  const normalizedRole = requestedRole === 'interviewer' ? 'interviewer'
    : requestedRole === 'user' ? 'user'
    : null;

  // First, try to find user by Google ID
  let user = await this.findOne({ googleId });

  if (user) {
    // Existing Google account — role-conflict check (signup mode only)
    if (normalizedRole && user.user_role !== normalizedRole) {
      return { conflict: true, existingRole: user.user_role };
    }
    // Update last login AND refresh name/picture from Google
    user.lastLogin = new Date();
    if (name) user.name = name;
    if (picture) user.profilePicture = picture;
    await user.save();
    return { user, isNewUser: false };
  }

  // Check if user exists with this email (maybe registered with email/password)
  user = await this.findOne({ email: email.toLowerCase() });

  if (user) {
    // Existing email account — same role-conflict rule.
    if (normalizedRole && user.user_role !== normalizedRole) {
      return { conflict: true, existingRole: user.user_role };
    }
    // Link Google account and sync profile
    user.googleId = googleId;
    user.authProvider = AUTH_PROVIDERS.GOOGLE;
    user.isEmailVerified = true; // Google emails are verified
    user.profilePicture = picture || user.profilePicture;
    if (name && (!user.name || user.name === 'User' || user.name === 'Google User')) {
      user.name = name;
    }
    user.lastLogin = new Date();
    await user.save();
    return { user, isNewUser: false };
  }

  // No user exists - create new user with the requested role (defaults to 'user')
  user = await this.create({
    name,
    email: email.toLowerCase(),
    googleId,
    authProvider: AUTH_PROVIDERS.GOOGLE,
    profilePicture: picture,
    isEmailVerified: true, // Google emails are verified
    lastLogin: new Date(),
    user_role: normalizedRole || USER_ROLES.USER,
  });

  return { user, isNewUser: true };
};

// Export model and constants
module.exports = mongoose.model('User', UserSchema);
module.exports.AUTH_PROVIDERS = AUTH_PROVIDERS;
