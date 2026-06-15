/**
 * Plan Guard Middleware
 * ─────────────────────
 * Enforces free vs pro tier limits on protected routes.
 *
 * Usage:
 *   router.post('/start', authenticate, checkSessionLimit, handler)
 *   router.post('/request', authenticate, requirePro, handler)
 */

const { HTTP_STATUS, PLAN_LIMITS } = require('../config/constants');
const { ApiError }                  = require('./errorHandler');
const InterviewSession              = require('../models/InterviewSession');

/**
 * requirePro — blocks any user whose plan is not 'pro'.
 * Attach after `authenticate`.
 */
const requirePro = (req, res, next) => {
  const plan = (req.user && req.user.plan) || 'free';
  if (plan !== 'pro') {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'This feature is available on the Pro plan. Upgrade to unlock it.',
      upgradeUrl: '/upgrade',
    });
  }
  next();
};

/**
 * checkSessionLimit — for free-tier users, counts how many AI interview
 * sessions they have started in the current calendar month and blocks the
 * request once they hit PLAN_LIMITS.FREE_MONTHLY_SESSIONS.
 *
 * Pro users pass through immediately without a DB query.
 */
const checkSessionLimit = async (req, res, next) => {
  try {
    const plan = (req.user && req.user.plan) || 'free';

    // Pro users have no limit — skip entirely
    if (plan === 'pro') return next();

    // Count sessions started in the current calendar month
    const now         = new Date();
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

    const count = await InterviewSession.countDocuments({
      user_id:   req.user.id,
      createdAt: { $gte: monthStart },
    });

    if (count >= PLAN_LIMITS.FREE_MONTHLY_SESSIONS) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success:    false,
        message:    `Free plan limit reached: ${PLAN_LIMITS.FREE_MONTHLY_SESSIONS} sessions per month. Upgrade to Pro for unlimited sessions.`,
        used:       count,
        limit:      PLAN_LIMITS.FREE_MONTHLY_SESSIONS,
        upgradeUrl: '/upgrade',
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * checkDifficultyAccess — free-tier users can only use easy/medium difficulty.
 * Reads `difficulty` from req.body and rejects 'hard' for free users.
 */
const checkDifficultyAccess = (req, res, next) => {
  const plan       = (req.user && req.user.plan) || 'free';
  const difficulty = (req.body.difficulty || 'medium').toLowerCase();

  if (plan !== 'pro' && !PLAN_LIMITS.FREE_DIFFICULTIES.includes(difficulty)) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success:    false,
      message:    `'${difficulty}' difficulty is a Pro feature. Upgrade to unlock all difficulty levels.`,
      upgradeUrl: '/upgrade',
    });
  }

  next();
};

module.exports = { requirePro, checkSessionLimit, checkDifficultyAccess };
