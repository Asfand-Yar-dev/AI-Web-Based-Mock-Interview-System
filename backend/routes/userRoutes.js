
/**
 * =============================================================================
 * USER ROUTES
 * =============================================================================
 * 
 * 
 * Defines all authentication and user-related API endpoints.
 * 
 * ROUTE STRUCTURE:
 * - Public Routes (no authentication required):
 *   - POST /register          - Create new user account
 * 
 *   - POST /login             - Authenticate with email/password
 *   - POST /google            - Authenticate with Google OAuth
*   - POST /forgot-password   - Request password reset token
 *   - POST /reset-password    - Reset password with token
 *   - POST /refresh-token     - Get new access token
 * 
 * - Protected Routes (requires valid JWT token):
 *   - GET    /me              - Get current user profile
 *   - PUT    /me              - Update current user profile
 *   - PUT    /change-password - Change user password
 *   - GET    /verify-token    - Verify if token is still valid
 *   - POST   /logout          - Invalidate refresh token
 *   - PATCH  /settings        - Update notification preferences
 *   - GET    /stats           - Get dashboard statistics
 * 
 * @version 2.0.0 (Phase 2 Complete — all architecture doc endpoints)
 * =============================================================================
 */

const express = require('express');
const router = express.Router();

// Import controller functions
const {
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
  refreshToken,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  updateSettings,
} = require('../controllers/authController');

// Import middleware
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');

// Import models for stats endpoint
const InterviewSession = require('../models/InterviewSession');
const User = require('../models/User');
const { HTTP_STATUS, USER_PLANS } = require('../config/constants');

/**
 * =============================================================================
 * PUBLIC ROUTES - No Authentication Required
 * =============================================================================
 */

/**
 * @route   POST /api/users/register
 * @desc    Register a new user account
 * @access  Public
 */
router.post('/register', ...registerValidation, asyncHandler(register));

/**
 * @route   POST /api/users/login
 * @desc    Authenticate user and get JWT token
 * @access  Public
 */
router.post('/login', ...loginValidation, asyncHandler(login));

/**
 * @route   POST /api/users/google
 * @desc    Authenticate user with Google ID token
 * @access  Public
 */
router.post('/google', asyncHandler(googleSignIn));

/**
 * @route   POST /api/users/forgot-password
 * @desc    Request a password reset token
 * @access  Public
 */
router.post('/forgot-password', asyncHandler(forgotPassword));

/**
 * @route   POST /api/users/verify-reset-otp
 * @desc    Verify the emailed OTP without consuming it (unlocks the reset step)
 * @access  Public
 */
router.post('/verify-reset-otp', asyncHandler(verifyResetOtp));

/**
 * @route   POST /api/users/reset-password
 * @desc    Reset password using the OTP from forgot-password
 * @access  Public
 */
router.post('/reset-password', asyncHandler(resetPassword));

/**
 * @route   POST /api/users/refresh-token
 * @desc    Get new access token using refresh token
 * @access  Public (requires valid refresh token in body)
 */
router.post('/refresh-token', asyncHandler(refreshToken));

/**
 * =============================================================================
 * PROTECTED ROUTES - Authentication Required
 * =============================================================================
 */

/**
 * @route   GET /api/users/me
 * @desc    Get current authenticated user's profile
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(getProfile));

/**
 * @route   PUT /api/users/me
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/me', authenticate, asyncHandler(updateProfile));

/**
 * @route   PUT /api/users/change-password
 * @desc    Change current user's password
 * @access  Private
 */
router.put('/change-password', authenticate, asyncHandler(changePassword));

/**
 * @route   POST /api/users/set-password
 * @desc    Set a password for an account that has none yet (e.g. Google sign-up)
 * @access  Private
 */
router.post('/set-password', authenticate, asyncHandler(setPassword));

/**
 * @route   GET /api/users/verify-token
 * @desc    Verify if the provided JWT token is valid
 * @access  Private
 */
router.get('/verify-token', authenticate, asyncHandler(verifyToken));

/**
 * @route   POST /api/users/logout
 * @desc    Invalidate refresh token (log out)
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(logout));

/**
 * @route   PATCH /api/users/settings
 * @desc    Update notification preferences
 * @access  Private
 */
router.patch('/settings', authenticate, asyncHandler(updateSettings));

/**
 * @route   GET /api/users/stats
 * @desc    Get dashboard statistics for current user
 * @access  Private
 * 
 * PERFORMANCE FIX: Uses MongoDB aggregation pipeline instead of
 * loading all sessions into memory (N+1 query problem at scale).
 */
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const mongoose = require('mongoose');
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Use aggregation pipeline — efficient even at 10,000+ sessions
  const [stats] = await InterviewSession.aggregate([
    { $match: { user_id: userObjectId } },
    {
      $group: {
        _id: null,
        totalInterviews: { $sum: 1 },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        inProgressCount: {
          $sum: { $cond: [{ $eq: ['$status', 'ongoing'] }, 1, 0] }
        },
        cancelledCount: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalScore: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'completed'] },
              { $ifNull: ['$overall_score', 0] },
              0
            ]
          }
        },
      }
    }
  ]);

  const totalInterviews = stats?.totalInterviews || 0;
  const completedCount = stats?.completedCount || 0;
  const averageScore = completedCount > 0 ? Math.round(stats.totalScore / completedCount) : 0;

  // Get recent 5 sessions (separate lightweight query)
  const recentSessions = await InterviewSession.find({ user_id: userId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('session_type jobTitle status overall_score createdAt duration')
    .lean();

  const recentSessionsFormatted = recentSessions.map(session => ({
    id: session._id,
    sessionType: session.session_type,
    jobTitle: session.jobTitle || '',
    status: session.status,
    score: session.overall_score,
    date: session.createdAt,
    duration: session.duration,
  }));

  // Calculate improvement from recent completed sessions
  let confidenceImprovement = 0;
  const completedRecent = await InterviewSession.find({
    user_id: userId,
    status: 'completed',
    overall_score: { $exists: true, $ne: null }
  })
    .sort({ createdAt: -1 })
    .limit(6)
    .select('overall_score createdAt')
    .lean();

  if (completedRecent.length >= 6) {
    const recent3Avg = completedRecent.slice(0, 3).reduce((s, ss) => s + (ss.overall_score || 0), 0) / 3;
    const prev3Avg = completedRecent.slice(3, 6).reduce((s, ss) => s + (ss.overall_score || 0), 0) / 3;
    confidenceImprovement = Math.round(recent3Avg - prev3Avg);
  } else if (completedRecent.length >= 2) {
    const latest = completedRecent[0].overall_score || 0;
    const previous = completedRecent[1].overall_score || 0;
    confidenceImprovement = latest - previous;
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      totalInterviews,
      completedInterviews: completedCount,
      averageScore,
      confidenceImprovement,
      recentSessions: recentSessionsFormatted,
      inProgressCount: stats?.inProgressCount || 0,
      cancelledCount: stats?.cancelledCount || 0,
    }
  });
}));

/**
 * @route   POST /api/users/upgrade-plan
 * @desc    Upgrade the current user's plan to 'pro' (stub — no payment gateway)
 * @access  Private
 *
 * Body: { plan: 'pro' | 'free' }  (users may only request 'pro'; admins use the admin route)
 */
router.post('/upgrade-plan', authenticate, asyncHandler(async (req, res) => {
  const { plan } = req.body;

  if (!plan || !Object.values(USER_PLANS).includes(plan)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: `Invalid plan. Must be one of: ${Object.values(USER_PLANS).join(', ')}`
    });
  }

  // Regular users can only request an upgrade, not a downgrade (admin handles that)
  if (req.user.role !== 'admin' && plan !== USER_PLANS.PRO) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'You can only upgrade your plan. Contact support to downgrade.'
    });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'User not found.' });
  }

  user.plan = plan;
  user.planActivatedAt = new Date();
  await user.save();

  // Issue a fresh JWT so the new plan is immediately reflected without re-login
  const jwt = require('jsonwebtoken');
  const { TOKEN_EXPIRY } = require('../config/constants');
  const newToken = jwt.sign(
    { id: user._id, email: user.email, role: user.user_role, plan: user.plan },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || TOKEN_EXPIRY.ACCESS }
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: `Plan upgraded to ${plan} successfully.`,
    data: { user: user.toSafeObject(), token: newToken }
  });
}));

module.exports = router;
