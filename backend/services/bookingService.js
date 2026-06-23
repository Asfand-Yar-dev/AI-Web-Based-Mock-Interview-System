/**
 * Booking Service — Premium Live Interview
 * -----------------------------------------
 * Encapsulates auto-matching of an interviewer to an applicant request.
 *
 * Source: Doc/premium_live_interview_architecture.md §3 Step 1 (auto-match)
 *         + §4 (round-robin / highest-rating-first weighting).
 */

const Interviewer = require('../models/Interviewer');
const LiveBooking = require('../models/LiveBooking');
const logger = require('../config/logger');
const { LIVE_BOOKING_STATUS } = require('../config/constants');
const { escapeRegex: _escapeRegex, exactCI: _exactCI } = require('../utils/regex');

/**
 * Check whether an interviewer is generally available at the given Date.
 * Compares against the interviewer's weekly availability slots.
 */
function _isWithinAvailability(interviewer, when) {
  if (!Array.isArray(interviewer.availability) || interviewer.availability.length === 0) {
    return true; // No availability declared — assume always available
  }
  const day = when.getDay();
  const hh = String(when.getHours()).padStart(2, '0');
  const mm = String(when.getMinutes()).padStart(2, '0');
  const t = `${hh}:${mm}`;

  return interviewer.availability.some(slot =>
    slot.dayOfWeek === day && slot.startTime <= t && t < slot.endTime
  );
}

/**
 * Find an interviewer that matches the requested role/skills/domain and is
 * free at the requested time. Applies a "highest rating first" tie-break and
 * skips anyone who already has a confirmed booking at the same slot.
 *
 * Matching rules (all exact + case-insensitive, all optional / degraded-gracefully):
 *  - domain  : interviewer.domains must contain the requested domain (exact, case-insensitive)
 *  - skills  : interviewer.skills must overlap with requested skills  (exact, case-insensitive, at least 1)
 *  - role    : interviewer.roles  must contain the requested role     (exact, case-insensitive; fuzzy keyword fallback)
 */
function getRoleKeywords(searchRole) {
  const normalized = searchRole.toLowerCase().trim();
  
  if (normalized.includes("front") || normalized.includes("ui") || normalized.includes("ux") || normalized.includes("web")) {
    return ["frontend", "front-end", "front end", "ui", "ux", "web"];
  }
  if (normalized.includes("back") || normalized.includes("server") || normalized.includes("api")) {
    return ["backend", "back-end", "back end", "server", "api", "database"];
  }
  if (normalized.includes("full") || normalized.includes("stack")) {
    return ["fullstack", "full-stack", "full stack", "frontend", "backend", "developer", "engineer"];
  }
  if (normalized.includes("mobile") || normalized.includes("android") || normalized.includes("ios") || normalized.includes("flutter") || normalized.includes("app")) {
    return ["mobile", "android", "ios", "flutter", "react native", "react-native", "app"];
  }
  if (normalized.includes("devops") || normalized.includes("sre") || normalized.includes("cloud") || normalized.includes("infra")) {
    return ["devops", "sre", "site reliability", "cloud", "infrastructure", "platform", "aws", "kubernetes"];
  }
  if (normalized.includes("data") || normalized.includes("ml") || normalized.includes("ai") || normalized.includes("machine") || normalized.includes("analyst")) {
    return ["data", "ml", "ai", "machine learning", "deep learning", "analyst", "science"];
  }
  if (normalized.includes("qa") || normalized.includes("test") || normalized.includes("quality")) {
    return ["qa", "testing", "test", "quality assurance", "sdet"];
  }
  if (normalized.includes("product") || normalized.includes("project") || normalized.includes("pm")) {
    return ["product", "project", "pm", "scrum", "agile"];
  }
  if (normalized.includes("security") || normalized.includes("cyber") || normalized.includes("pentest")) {
    return ["cybersecurity", "security", "pentest", "information security", "secops"];
  }

  const words = normalized
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w && !["developer", "engineer", "designer", "manager", "lead", "architect", "senior", "junior", "staff", "principal"].includes(w));
  
  return words.length ? words : [normalized];
}

/**
 * Find an interviewer who:
 *  - is accepting bookings
 *  - is not busy at slot ± 1h
 *  - is available during the slot's weekday/hour
 *  - domains matches the requested domain
 *  - skills  : interviewer.skills must overlap with requested skills  (case-insensitive, at least 1)
 *  - role    : interviewer.roles  must contain the requested role     (case-insensitive)
 *
 * @returns {Promise<Interviewer|null>}
 */
async function findMatchingInterviewer({ role, skills = [], domain, scheduledTime, excludeInterviewerIds = [] }) {
  const slot = new Date(scheduledTime);

  // Interviewers to skip entirely (e.g. ones who already declined this booking).
  const excludeClause = excludeInterviewerIds.length
    ? { _id: { $nin: excludeInterviewerIds } }
    : {};

  // Build a flexible filter — all conditions are case-insensitive regex
  // [VETTING QUARANTINED] `isVerified: true` removed so unverified interviewers
  // can still be matched while vetting is disabled. Restore on request.
  const filter = { isAcceptingBookings: { $ne: false } /*, isVerified: true */, ...excludeClause };

  if (domain) {
    // Anchored, case-insensitive exact match — robust even if the stored
    // domain wasn't lowercased at save time (e.g. edited directly in the DB).
    filter.domains = _exactCI(domain);
  }

  if (role && role.trim()) {
    // Exact, case-insensitive match against the interviewer's declared roles.
    filter.roles = { $in: [_exactCI(role)] };
  }

  if (skills.length) {
    // Overlap on at least one skill, each matched exactly & case-insensitively.
    filter.skills = { $in: skills.map(_exactCI) };
  }

  logger.info(`[booking] matching filter: ${JSON.stringify({ domain, role, skills })}`);

  let candidates = await Interviewer.find(filter)
    .sort({ rating: -1, totalSessions: 1 })
    .lean();

  // Fallback 1: drop skills filter if no candidates found
  if (!candidates.length && skills.length) {
    logger.info('[booking] no match with skills — retrying without skills filter');
    const relaxed = { ...filter };
    delete relaxed.skills;
    candidates = await Interviewer.find(relaxed).sort({ rating: -1, totalSessions: 1 }).lean();
  }

  // Fallback 2: relax the exact-role match to fuzzy keyword matching
  // (e.g. "Senior Frontend Developer" → frontend / ui / web). Skills dropped.
  if (!candidates.length && role && role.trim()) {
    logger.info('[booking] no exact role match — retrying with keyword role match');
    const keywords = getRoleKeywords(role);
    const pattern = keywords.map(_escapeRegex).join('|');
    // [VETTING QUARANTINED] `isVerified: true` removed — restore on request.
    const relaxed = {
      isAcceptingBookings: { $ne: false } /*, isVerified: true */,
      roles: { $elemMatch: { $regex: new RegExp(pattern, 'i') } },
      ...excludeClause,
    };
    if (domain) relaxed.domains = _exactCI(domain);
    candidates = await Interviewer.find(relaxed).sort({ rating: -1, totalSessions: 1 }).lean();
  }

  // Fallback 3: drop the role filter entirely — match anyone in the domain.
  if (!candidates.length && role) {
    logger.info('[booking] no match with role — retrying without role filter');
    // [VETTING QUARANTINED] `isVerified: true` removed — restore on request.
    const relaxed = { isAcceptingBookings: { $ne: false } /*, isVerified: true */, ...excludeClause };
    if (domain) relaxed.domains = _exactCI(domain);
    candidates = await Interviewer.find(relaxed).sort({ rating: -1, totalSessions: 1 }).lean();
  }

  if (!candidates.length) return null;

  // Pull conflicting bookings in one query for efficiency
  const conflictWindowStart = new Date(slot.getTime() - 60 * 60 * 1000); // ±1h window
  const conflictWindowEnd   = new Date(slot.getTime() + 60 * 60 * 1000);

  const conflicts = await LiveBooking.find({
    interviewerId: { $in: candidates.map(c => c._id) },
    scheduledTime: { $gte: conflictWindowStart, $lt: conflictWindowEnd },
    status: { $in: [
      LIVE_BOOKING_STATUS.PENDING_APPROVAL,
      LIVE_BOOKING_STATUS.ACCEPTED,
      LIVE_BOOKING_STATUS.PAYMENT_PENDING,
      LIVE_BOOKING_STATUS.PAYMENT_COMPLETED,
      LIVE_BOOKING_STATUS.MEETING_SCHEDULED,
      LIVE_BOOKING_STATUS.MEETING_STARTED
    ] },
  }).select('interviewerId');

  const busy = new Set(conflicts.map(c => String(c.interviewerId)));

  for (const interviewer of candidates) {
    if (busy.has(String(interviewer._id))) continue;
    if (!_isWithinAvailability(interviewer, slot)) continue;
    return interviewer;
  }

  return null;
}


/**
 * Create a pending-payment LiveBooking for the applicant.
 * Throws when no interviewer matches (Architecture §5.3).
 */
async function createPendingBooking({ applicantId, role, skills, domain, scheduledTime, durationMinutes }) {
  const interviewer = await findMatchingInterviewer({ role, skills, domain, scheduledTime });

  if (!interviewer) {
    const err = new Error('No interviewer is available for the requested role/time. Please pick a different slot or relax your skill list.');
    err.statusCode = 409;
    err.code = 'NO_INTERVIEWER_MATCH';
    throw err;
  }

  const booking = await LiveBooking.create({
    applicantId,
    interviewerId: interviewer._id,
    role,
    skills,
    domain,
    scheduledTime,
    durationMinutes,
  });

  logger.info(`LiveBooking created ${booking._id} → interviewer ${interviewer._id} @ ${scheduledTime}`);
  return { booking, interviewer };
}

module.exports = {
  findMatchingInterviewer,
  createPendingBooking,
};
