/**
 * Admin Routes
 * Provides aggregated platform data for the admin dashboard.
 *
 * All routes require JWT authentication + admin role.
 */

const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const InterviewSession = require('../models/InterviewSession');
const Answer = require('../models/Answer');
const { HTTP_STATUS } = require('../config/constants');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, authorize } = require('../middleware/auth');
const aiServiceClient = require('../services/aiServiceClient');
const logger = require('../config/logger');
const { cache } = require('../middleware/cache');
const redis = require('../config/redis');

const router = express.Router();

// All admin routes require auth + admin role
router.use(authenticate, authorize('admin'));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard
// ─────────────────────────────────────────────────────────────────────────────
router.get('/dashboard', cache(redis.TTL.SHORT), asyncHandler(async (req, res) => {

  const SEVEN_DAYS_AGO   = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
  const THIRTY_DAYS_AGO  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // Sessions older than 4 h with status=ongoing are considered stale (browser/tab closed)
  const FOUR_HOURS_AGO   = new Date(Date.now() - 4  * 60 * 60 * 1000);

  // ── All heavy queries run concurrently ────────────────────────────────────
  const [
    totalUsers,
    adminUsers,
    proUsers,
    blockedUsers,
    activeUsersLast7Days,
    newUsersLast30Days,
    sessionAgg,
    difficultyAgg,
    typeAgg,
    roleAgg,
    usersList,
    flaggedSessions,
    recentRegistrations,
    recentCompletions,
    recentSessionStarts,
    totalAnswers,
    aiHealth,
  ] = await Promise.all([

    // ── User counts ────────────────────────────────────────────────────
    User.countDocuments(),
    User.countDocuments({ user_role: 'admin' }),
    User.countDocuments({ plan: 'pro' }),
    User.countDocuments({ isActive: false }),

    // Active = logged in within last 7 days (matches UI "Last 7 days")
    User.countDocuments({ lastLogin: { $gte: SEVEN_DAYS_AGO } }),

    // New registrations in last 30 days
    User.countDocuments({ createdAt: { $gte: THIRTY_DAYS_AGO } }),

    // ── Session aggregations ───────────────────────────────────────────
    InterviewSession.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    InterviewSession.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    ]),
    InterviewSession.aggregate([
      { $group: { _id: '$session_type', count: { $sum: 1 } } },
    ]),

    // ── User role distribution ─────────────────────────────────────────
    User.aggregate([
      { $group: { _id: '$user_role', count: { $sum: 1 } } },
    ]),

    // ── Users list (latest 100, with interview count via lookup) ───────
    User.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: 'interviewsessions',
          localField: '_id',
          foreignField: 'user_id',
          as: 'sessions',
        },
      },
      {
        $project: {
          _id: 1, name: 1, email: 1, user_role: 1,
          isActive: 1, createdAt: 1,
          interviewCount: { $size: '$sessions' },
        },
      },
    ]),

    // ── Flagged sessions (score < 50, completed) ───────────────────────
    InterviewSession.find({
      status: 'completed',
      overall_score: { $lt: 50, $ne: null },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('session_type overall_score createdAt'),

    // ── Activity: recent registrations ────────────────────────────────
    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name createdAt'),

    // ── Activity: recent completed sessions ───────────────────────────
    InterviewSession.find({ status: 'completed' })
      .sort({ ended_at: -1 })
      .limit(5)
      .select('session_type overall_score ended_at jobTitle'),

    // ── Activity: recently started sessions ───────────────────────────
    InterviewSession.find({ status: 'ongoing' })
      .sort({ started_at: -1 })
      .limit(3)
      .select('session_type started_at jobTitle'),

    // ── Total answers submitted across all time ────────────────────────
    Answer.countDocuments(),

    // ── AI Gateway health ──────────────────────────────────────────────
    aiServiceClient.healthCheck().catch(() => ({ available: false, services: {} })),
  ]);

  // ── Derived session stats ─────────────────────────────────────────────────
  const capitalize = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown';

  const statusMap      = Object.fromEntries(sessionAgg.map(s => [s._id, s.count]));
  const totalInterviews = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const completedCount  = statusMap['completed']  || 0;
  const ongoingCount    = statusMap['ongoing']     || 0;
  const cancelledCount  = statusMap['cancelled']   || 0;
  const pendingCount    = statusMap['pending']     || 0;

  const completionRate = totalInterviews > 0
    ? Math.round((completedCount / totalInterviews) * 100)
    : 0;

  // ── Feedback scoring (separate query — only scored, completed sessions) ────
  const scoredSessions = await InterviewSession.find({
    status: 'completed',
    overall_score: { $ne: null },
  }).select('overall_score');

  const avgScore = scoredSessions.length > 0
    ? Math.round(scoredSessions.reduce((s, sess) => s + sess.overall_score, 0) / scoredSessions.length)
    : 0;
  const lowAlerts      = scoredSessions.filter(s => s.overall_score < 50).length;
  const positiveCount  = scoredSessions.filter(s => s.overall_score >= 80).length;
  const positiveFeedbackRate = scoredSessions.length > 0
    ? Math.round((positiveCount / scoredSessions.length) * 100)
    : 0;

  // ── Distinct users in active sessions (started within last 4 h — stale sessions excluded) ──
  const ongoingUserIds = await InterviewSession.distinct('user_id', {
    status: 'ongoing',
    started_at: { $gte: FOUR_HOURS_AGO },
  });

  // ── Distribution maps ─────────────────────────────────────────────────────
  const difficultyDistribution    = Object.fromEntries(
    difficultyAgg.map(d => [capitalize(d._id || 'unknown'), d.count])
  );
  const sessionTypeDistribution   = Object.fromEntries(
    typeAgg.map(t => [capitalize(t._id || 'general'), t.count])
  );
  const roleDistribution          = Object.fromEntries(
    roleAgg.map(r => [capitalize(r._id || 'user'), r.count])
  );
  const statusDistribution        = Object.fromEntries(
    sessionAgg.map(s => [capitalize(s._id), s.count])
  );

  // ── Users list ────────────────────────────────────────────────────────────
  const users = usersList.map(u => ({
    id:         u._id.toString(),
    name:       u.name,
    email:      u.email,
    role:       u.user_role || 'user',
    status:     u.isActive ? 'active' : 'inactive',
    interviews: u.interviewCount,
    joined:     u.createdAt.toISOString(),
  }));

  // ── Recent activity feed (registrations + completions + starts) ───────────
  const recentActivity = [
    ...recentRegistrations.map(u => ({
      id:     u._id.toString(),
      title:  'New user registered',
      detail: u.name,
      time:   u.createdAt.toISOString(),
      type:   'success',
    })),
    ...recentCompletions.map(s => ({
      id:     s._id.toString(),
      title:  'Interview completed',
      detail: `${s.jobTitle || capitalize(s.session_type)} · Score ${s.overall_score ?? 'N/A'}`,
      time:   (s.ended_at || new Date()).toISOString(),
      type:   s.overall_score >= 70 ? 'success' : s.overall_score >= 40 ? 'warning' : 'neutral',
    })),
    ...recentSessionStarts.map(s => ({
      id:     s._id.toString(),
      title:  'Interview started',
      detail: s.jobTitle || capitalize(s.session_type),
      time:   (s.started_at || new Date()).toISOString(),
      type:   'neutral',
    })),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10);

  // ── Services ──────────────────────────────────────────────────────────────

  // Backend: real runtime metrics
  const uptimeSec = process.uptime();
  const uptimeFormatted =
    uptimeSec < 60    ? `${Math.floor(uptimeSec)}s` :
    uptimeSec < 3600  ? `${Math.floor(uptimeSec / 60)}m ${Math.floor(uptimeSec % 60)}s` :
                        `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`;
  const heapMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  // MongoDB: real ping latency
  let mongoPingMs = null;
  try {
    const t0 = Date.now();
    await mongoose.connection.db.admin().ping();
    mongoPingMs = Date.now() - t0;
  } catch (_) { /* null if ping fails */ }
  const dbState = mongoose.connection.readyState;

  // AI Gateway: only loaded models
  const rawModels    = aiHealth.services || {};
  const loadedModels = Object.fromEntries(
    Object.entries(rawModels).filter(([, loaded]) => loaded === true)
  );

  const services = [
    {
      id:      'backend',
      name:    'Backend API',
      status:  'running',
      latency: `Uptime ${uptimeFormatted}`,
      metrics: { uptime: uptimeFormatted, heap: `${heapMB} MB` },
    },
    {
      id:      'mongodb',
      name:    'MongoDB',
      status:  dbState === 1 ? 'connected' : 'degraded',
      latency: mongoPingMs !== null ? `${mongoPingMs} ms ping` : 'connected',
      metrics: {
        ping:  mongoPingMs !== null ? `${mongoPingMs} ms` : '—',
        state: dbState === 1 ? 'connected' : 'disconnected',
      },
    },
    {
      id:      'ai-gateway',
      name:    'AI Gateway',
      status:  aiHealth.available ? 'healthy' : 'degraded',
      latency: aiHealth.available ? 'reachable' : 'unreachable',
      ...(aiHealth.available && Object.keys(loadedModels).length > 0
        ? { models: loadedModels }
        : {}),
    },
  ];

  // ── Admin settings — real env config ─────────────────────────────────────
  const jwtExpiry  = process.env.JWT_EXPIRES_IN                     || '24h';
  const rateLimit  = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS      || '100');  // matches server.js default
  const authLimit  = parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '10');
  const corsOrigin = process.env.CORS_ORIGIN                          || 'http://localhost:3000';
  const aiEnabled  = process.env.USE_REAL_AI !== 'false';
  const nodeEnv    = process.env.NODE_ENV                             || 'development';
  // WHISPER_MODEL_SIZE lives in ai_gateway/.env — ask the gateway for it via healthCheck
  const whisperModel = aiHealth.whisper_model || aiHealth.whisperModel || 'base';

  const adminSettings = {
    environment:                 nodeEnv,
    aiEnabled,
    whisperModel,
    jwtExpiry,
    rateLimit,
    authRateLimit:               authLimit,
    corsOrigin,
    notifyOnCriticalDegradation: false, // No alert system implemented yet
  };

  // ── Access policies — real values from env ────────────────────────────────
  const accessPolicies = [
    {
      id:     'rbac',
      name:   'Role-Based Access Control',
      status: 'active',
      detail: '3 roles: user, admin, interviewer',
    },
    {
      id:     'jwt',
      name:   'JWT Authentication',
      status: 'active',
      detail: `Expires in ${jwtExpiry}`,
    },
    {
      id:     'rate',
      name:   'Rate Limiting',
      status: 'active',
      detail: `${rateLimit} req / 15 min (auth: ${authLimit})`,
    },
    {
      id:     'cors',
      name:   'CORS Policy',
      status: 'active',
      detail: corsOrigin,
    },
    {
      id:     'ai',
      name:   'AI Analysis Pipeline',
      status: aiEnabled ? 'active' : 'disabled',
      detail: aiEnabled
        ? `Gateway enabled · Whisper ${whisperModel}`
        : 'Heuristic fallback mode',
    },
  ];

  // ── Flagged sessions ──────────────────────────────────────────────────────
  const recentFlaggedSessions = flaggedSessions.map(s => ({
    id:          s._id.toString(),
    sessionType: s.session_type || 'general',
    score:       s.overall_score ?? 0,
    createdAt:   s.createdAt.toISOString(),
  }));

  // ── Build response ────────────────────────────────────────────────────────
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      stats: {
        totalUsers,
        freeUsers:           totalUsers - proUsers,
        premiumUsers:        proUsers,
        totalInterviews,
        completionRate,
        activeUsers:         activeUsersLast7Days,
        ongoingInterviews:   ongoingUserIds.length,
        cancelledInterviews: cancelledCount,
        pendingInterviews:   pendingCount,
        totalAnswers,
        newUsersLast30Days,
      },
      interviewee: {
        users:            totalUsers - adminUsers,
        usersInInterview: ongoingUserIds.length,
        totalInterviews,
        premiumInterviews: { withBot: 0 },
      },
      analytics: {
        roleDistribution,
        statusDistribution,
        difficultyDistribution,
        sessionTypeDistribution,
      },
      adminSettings,
      feedbackMonitoring: {
        averageFeedbackScore: avgScore,
        lowFeedbackAlerts:    lowAlerts,
        positiveFeedbackRate,
        recentFlaggedSessions,
      },
      securityAccessControl: {
        adminUsers,
        activeSessions: ongoingUserIds.length,
        blockedUsers,
        accessPolicies,
      },
      users,
      recentActivity,
      services,
    },
  });
}));

/**
 * PATCH /api/admin/users/:id/plan
 * Admin-only: set any user's plan to 'free' or 'pro'
 */
router.patch('/users/:id/plan', asyncHandler(async (req, res) => {
  const { plan } = req.body;
  const { USER_PLANS } = require('../config/constants');

  if (!plan || !Object.values(USER_PLANS).includes(plan)) {
    return res.status(400).json({
      success: false,
      message: `Invalid plan. Valid values: ${Object.values(USER_PLANS).join(', ')}`
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  user.plan            = plan;
  user.planActivatedAt = new Date();
  await user.save();

  logger.info(`Admin set user ${user.email} plan to '${plan}'`);

  res.status(200).json({
    success: true,
    message: `User plan updated to '${plan}'.`,
    data:    { id: user._id, email: user.email, plan: user.plan, planActivatedAt: user.planActivatedAt }
  });
}));

module.exports = router;

