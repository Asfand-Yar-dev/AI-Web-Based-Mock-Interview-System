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
 * Matching rules (all case-insensitive, all optional / degraded-gracefully):
 *  - domain  : interviewer.domains must contain the requested domain (case-insensitive)
 *  - skills  : interviewer.skills must overlap with requested skills  (case-insensitive, at least 1)
 *  - role    : interviewer.roles  must contain the requested role     (case-insensitive)
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
async function findMatchingInterviewer({ role, skills = [], domain, scheduledTime }) {
  const slot = new Date(scheduledTime);

  // Build a flexible filter — all conditions are case-insensitive regex
  const filter = { isAcceptingBookings: { $ne: false }, isVerified: true };

  if (domain) {
    filter.domains = domain.trim().toLowerCase();
  }

  if (role && role.trim()) {
    const keywords = getRoleKeywords(role);
    const pattern = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    filter.roles = { $elemMatch: { $regex: new RegExp(pattern, 'i') } };
  }

  if (skills.length) {
    const skillRegexes = skills.map(s => new RegExp(s.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    filter.skills = { $elemMatch: { $in: skillRegexes } };
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

  // Fallback 2: drop role filter too
  if (!candidates.length && role) {
    logger.info('[booking] no match with role — retrying without role filter');
    const relaxed = { isAcceptingBookings: { $ne: false }, isVerified: true };
    if (domain) relaxed.domains = domain.trim().toLowerCase();
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
