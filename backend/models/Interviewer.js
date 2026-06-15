/**
 * Interviewer Profile Model — Premium Live Interview Feature
 * ----------------------------------------------------------
 * Represents a human expert who has registered to conduct paid live mock
 * interviews on the platform. Created/updated via POST /api/interviewers.
 *
 * NOTE: This replaces the old AI-Interviewer stub that used name/email fields.
 * The AI-interviewer configuration lives in AIInterviewerConfig.js.
 *
 * Source: Doc/premium_live_interview_architecture.md §2.A
 */

const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0 = Sun, 6 = Sat
  startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },  // "09:00"
  endTime:   { type: String, required: true, match: /^\d{2}:\d{2}$/ },  // "17:00"
}, { _id: false });

const interviewerSchema = new mongoose.Schema({
  // ── Identity ─────────────────────────────────────────────────────────────
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'userId is required'],
    unique: true,
    index: true,
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  bio:         { type: String, maxlength: 2000, trim: true },
  linkedinUrl: { type: String, trim: true },

  // ── Matching fields ───────────────────────────────────────────────────────
  // All lowercase for case-insensitive matching
  domains:  [{ type: String, trim: true, lowercase: true }], // e.g. ["frontend", "backend"]
  skills:   [{ type: String, trim: true }],                  // e.g. ["React", "Node.js"]
  roles:    [{ type: String, trim: true }],                  // e.g. ["Senior Software Engineer"]

  // ── Pricing ───────────────────────────────────────────────────────────────
  hourlyRate: {
    type: Number,
    required: [true, 'hourlyRate is required'],
    min: [0, 'hourlyRate cannot be negative'],
  },
  currency: { type: String, default: 'USD', uppercase: true, trim: true },

  // ── Availability ──────────────────────────────────────────────────────────
  availability: [availabilitySlotSchema],

  // ── Booking availability flag ─────────────────────────────────────────────
  isAcceptingBookings: { type: Boolean, default: true, index: true },

  // ── Performance metrics ───────────────────────────────────────────────────
  rating:        { type: Number, default: 0, min: 0, max: 5 },
  totalSessions: { type: Number, default: 0, min: 0 },
  totalReviews:  { type: Number, default: 0, min: 0 },

  // ── AI Vetting & Verification ─────────────────────────────────────────────
  isVerified: { type: Boolean, default: false },
  vettingStatus: {
    type: String,
    enum: ['unstarted', 'interviewing', 'approved', 'rejected'],
    default: 'unstarted'
  },
  vettingScore: { type: Number, default: 0 },
  vettingConversation: [
    {
      role: { type: String, enum: ['user', 'assistant', 'system'] },
      content: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ],

}, { timestamps: true });

// ── Compound index for the matching query in bookingService.js ─────────────
interviewerSchema.index({ isAcceptingBookings: 1, domains: 1, rating: -1, totalSessions: 1 });

module.exports = mongoose.model('Interviewer', interviewerSchema);
