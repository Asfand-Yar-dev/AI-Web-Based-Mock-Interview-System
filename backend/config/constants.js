/**
 * Application Constants
 * Centralized location for all magic strings and configuration values
 */

// User Roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  INTERVIEWER: 'interviewer'
};

// User Plan Tiers
const USER_PLANS = {
  FREE: 'free',
  PRO:  'pro',
};

// Plan Feature Limits
const PLAN_LIMITS = {
  FREE_MONTHLY_SESSIONS: 3,              // max AI interview sessions per calendar month
  FREE_DIFFICULTIES:     ['easy', 'medium'], // free users cannot start 'hard' sessions
};

// Interview Session Status
const SESSION_STATUS = {
  PENDING: 'pending',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Question Difficulty Levels
// IMPORTANT: Must be lowercase — used in both Question and InterviewSession schemas
const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

// Authentication Providers
const AUTH_PROVIDERS = {
  LOCAL: 'local',
  GOOGLE: 'google'
};

// Schedule Status
const SCHEDULE_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
};

// Token Expiry Times
const TOKEN_EXPIRY = {
  ACCESS: '24h',
  REFRESH: '7d'
};

// Validation Limits
const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50
};

// Sign-up ONLY accepts these exact email domains — every other domain is
// rejected. Keeps registrations to providers/inboxes we trust for
// verification/OTP delivery. Add a domain here to allow it.
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'icloud.com',
  'student.buitms.edu.pk',
];

// ── Premium Live Interview ────────────────────────────────────────────────────
// Booking lifecycle statuses — 7-stage manual approval + payment + meeting flow
//
// Flow:  pending_approval → accepted → payment_pending → payment_completed
//                                   → meeting_scheduled → meeting_started → meeting_completed
//        pending_approval → rejected  (interviewer rejects)
const LIVE_BOOKING_STATUS = {
  PENDING_APPROVAL:   'pending_approval',   // User sent request, awaiting interviewer response
  ACCEPTED:           'accepted',           // Interviewer accepted; user notified to pay
  REJECTED:           'rejected',           // Interviewer declined the request
  PAYMENT_PENDING:    'payment_pending',    // Accepted; awaiting user payment
  PAYMENT_COMPLETED:  'payment_completed',  // Payment confirmed by gateway
  MEETING_SCHEDULED:  'meeting_scheduled',  // Confirmed; meeting room ready, awaiting start time
  MEETING_STARTED:    'meeting_started',    // Both participants joined the room
  MEETING_COMPLETED:  'meeting_completed',  // Session ended successfully
  // Legacy / error states
  EVALUATING_AI:      'evaluating_ai',      // Recording sent to Python AI gateway
  RESULTS_READY:      'results_ready',      // AI + human feedback both in
  FAILED_NO_SHOW:     'failed_no_show',     // Interviewer did not join within grace period
  REFUNDED:           'refunded',           // Auto-refund issued after no-show
};

// Operational limits for the live interview pipeline  (Architecture §4 + §5)
const LIVE_INTERVIEW = {
  DEFAULT_DURATION_MINUTES:     45,
  NO_SHOW_GRACE_MINUTES:        10,   // §5.2 — how long we wait before no-show
  AI_PIPELINE_TIMEOUT_MINUTES:  20,   // §5.1 — Python gateway deadline
  MAX_AI_RETRIES:                3,   // §5.1 — backoff attempts before bypassing
  MIN_BOOKING_LEAD_MINUTES:      60,  // bookings must be ≥ 60 min in the future
};

module.exports = {
  USER_ROLES,
  USER_PLANS,
  PLAN_LIMITS,
  SESSION_STATUS,
  DIFFICULTY_LEVELS,
  AUTH_PROVIDERS,
  SCHEDULE_STATUS,
  PAYMENT_STATUS,
  HTTP_STATUS,
  TOKEN_EXPIRY,
  VALIDATION,
  ALLOWED_EMAIL_DOMAINS,
  // Premium Live Interview
  LIVE_BOOKING_STATUS,
  LIVE_INTERVIEW,
};
