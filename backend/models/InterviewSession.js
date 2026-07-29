/**
 * Interview Session Model
 * Tracks interview sessions for users
 * 
 * ARCHITECTURE ALIGNMENT: Added jobTitle, skills, jobDescription,
 * difficulty, duration fields per architecture document section 5.2
 */

const mongoose = require('mongoose');
const { SESSION_STATUS } = require('../config/constants');

const interviewSessionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  // --- Fields from Architecture Doc Section 5.2 ---
  jobTitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Job title cannot exceed 200 characters']
  },
  skills: [{
    type: String,
    trim: true
  }],
  jobDescription: {
    type: String,
    trim: true,
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  // --- End Architecture Doc Fields ---
  session_type: {
    type: String,
    trim: true,
    default: 'general'
  },
  status: {
    type: String,
    enum: Object.values(SESSION_STATUS),
    default: SESSION_STATUS.PENDING
  },
  started_at: {
    type: Date
  },
  ended_at: {
    type: Date
  },
  total_questions: {
    type: Number,
    default: 0
  },
  answered_questions: {
    type: Number,
    default: 0
  },
  overall_score: {
    type: Number,
    min: 0,
    max: 100
  },
  // Store duration in seconds (architecture doc section 5.2)
  duration: {
    type: Number,
    min: 0
  },
  // Cached AI session insights — role-grounded strengths / improvements / summary
  // generated once from the full Q&A transcript so we never re-call the AI on
  // every results-page load. Shape: { strengths: [], improvements: [], summary, generatedAt }.
  ai_insights: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

/**
 * Pre-save: auto-calculate duration when session ends.
 * Mongoose 8+ / 9: use sync middleware — the legacy `next` callback is not passed.
 */
interviewSessionSchema.pre('save', function () {
  if (this.started_at && this.ended_at && this.isModified('ended_at')) {
    this.duration = Math.round((this.ended_at - this.started_at) / 1000);
  }
});

/**
 * Calculate session duration in minutes (virtual - backward compatible)
 */
interviewSessionSchema.virtual('durationMinutes').get(function () {
  if (this.duration) {
    return Math.round(this.duration / 60);
  }
  if (this.started_at && this.ended_at) {
    return Math.round((this.ended_at - this.started_at) / (1000 * 60));
  }
  return null;
});

/**
 * Include virtuals when converting to JSON
 */
interviewSessionSchema.set('toJSON', { virtuals: true });
interviewSessionSchema.set('toObject', { virtuals: true });

/**
 * PERFORMANCE: Compound indexes for common query patterns
 * Critical for 10,000+ sessions
 */
interviewSessionSchema.index({ user_id: 1, status: 1, createdAt: -1 });
interviewSessionSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);