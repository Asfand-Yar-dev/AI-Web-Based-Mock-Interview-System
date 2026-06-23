/**
 * Interviewer Profile Routes — Premium Live Interview Feature
 *
 *   POST   /api/interviewers          Create/upsert my interviewer profile
 *   GET    /api/interviewers/me       Get my own interviewer profile
 *   PATCH  /api/interviewers/me       Update my own profile
 *   GET    /api/interviewers          Public discovery (search by domain/skills)
 *   GET    /api/interviewers/:id      Public profile detail
 */

const express = require('express');
const Interviewer = require('../models/Interviewer');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { HTTP_STATUS, USER_ROLES } = require('../config/constants');
const { exactCI, containsCI } = require('../utils/regex');

const router = express.Router();

// ── Discovery ─────────────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const { domain, skill, role } = req.query;

  // Use $ne: false so interviewers who never explicitly set the flag still appear
  // [VETTING QUARANTINED] `isVerified: true` removed so unverified interviewers
  // still appear in public search while vetting is disabled. Restore on request.
  const filter = { isAcceptingBookings: { $ne: false } /*, isVerified: true */ };

  // All matching is case-insensitive and regex-escaped (so values like "C++"
  // or "Node.js" can't break the query). Domain is an exact match; skill/role
  // allow substring search for a friendlier discovery experience.
  if (domain) {
    filter.domains = exactCI(domain);
  }
  if (skill) {
    filter.skills = { $elemMatch: { $regex: containsCI(skill) } };
  }
  if (role) {
    filter.roles = { $elemMatch: { $regex: containsCI(role) } };
  }

  const list = await Interviewer.find(filter)
    .populate('userId', 'name profilePicture')
    .sort({ rating: -1 })
    .limit(50);
  res.status(HTTP_STATUS.OK).json({ success: true, data: list });
}));

// ── Self-service ──────────────────────────────────────────────────────────
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const profile = await Interviewer.findOne({ userId: req.user.id });
  if (!profile) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'No interviewer profile yet');
  res.status(HTTP_STATUS.OK).json({ success: true, data: profile });
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { bio, domains, skills, roles, hourlyRate, availability, linkedinUrl, isAcceptingBookings, yearsOfExperience } = req.body;
  if (typeof hourlyRate !== 'number' || hourlyRate < 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'hourlyRate is required and must be ≥ 0');
  }

  const updateDoc = {
    bio,
    domains,
    skills,
    roles,
    hourlyRate,
    linkedinUrl,
    yearsOfExperience,
    // Always default to accepting bookings unless explicitly set to false
    isAcceptingBookings: isAcceptingBookings !== false,
  };

  if (availability !== undefined) {
    updateDoc.availability = availability;
  }

  const profile = await Interviewer.findOneAndUpdate(
    { userId: req.user.id },
    updateDoc,
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  // Promote the User to "interviewer" role if not already
  await User.findByIdAndUpdate(req.user.id, { user_role: USER_ROLES.INTERVIEWER });

  res.status(HTTP_STATUS.OK).json({ success: true, data: profile });
}));

// Note: authorize() removed — the route filter { userId: req.user.id } already
// ensures only the profile owner can update it. Removing avoids 403 for new
// interviewers whose JWT still carries role:'user' until they re-login.
router.patch('/me', authenticate, asyncHandler(async (req, res) => {
  const updates = {};
  const allowedFields = ['bio', 'domains', 'skills', 'roles', 'hourlyRate', 'availability', 'isAcceptingBookings', 'linkedinUrl', 'yearsOfExperience'];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const profile = await Interviewer.findOneAndUpdate(
    { userId: req.user.id },
    updates,
    { new: true, runValidators: true }
  );
  if (!profile) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'No interviewer profile');
  res.status(HTTP_STATUS.OK).json({ success: true, data: profile });
}));

// ── Public detail (must come last so :id doesn't shadow /me) ──────────────
router.get('/:id', asyncHandler(async (req, res) => {
  const profile = await Interviewer.findById(req.params.id).populate('userId', 'name profilePicture');
  if (!profile) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interviewer not found');
  res.status(HTTP_STATUS.OK).json({ success: true, data: profile });
}));

module.exports = router;
