/**
 * Answer Model
 * Stores user answers with audio metadata
 * 
 * FIXED: Consistent field naming (was mixing camelCase with snake_case)
 * ADDED: Proper indexes for scalability
 */

const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  // === REFERENCES (using consistent camelCase) ===
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterviewSession',
    required: [true, 'Interview session ID is required'],
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: [true, 'Question ID is required'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },

  // === ANSWER CONTENT ===
  answerText: {
    type: String,
    trim: true,
  },

  // === AUDIO FILE METADATA (Architecture Doc Section 5.5) ===
  audioFileUrl: {
    type: String,
  },
  audioFileName: {
    type: String,
  },
  audioFileSize: {
    type: Number, // bytes
  },
  audioDuration: {
    type: Number, // seconds
  },

  // === AI PROCESSING FIELDS ===
  transcription: {
    type: String, // Text transcription from AI
  },

  // Evaluation score from AI analysis (0-100)
  evaluationScore: {
    type: Number,
    min: 0,
    max: 100,
  },

  // AI-generated feedback text
  feedback: {
    type: String,
  },

  // Ideal/correct answer — generated on demand (and cached) when the applicant's
  // answer scored as wrong, so the results page can show what a good answer was.
  modelAnswer: {
    type: String,
  },

  // Processing status for async AI pipeline
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },

  // === TIMESTAMPS ===
  recordedAt: {
    type: Date,
    default: Date.now,
  },
  processedAt: {
    type: Date,
  },
}, {
  timestamps: true, // adds createdAt, updatedAt
});

/**
 * PERFORMANCE: Compound indexes for common query patterns
 */
AnswerSchema.index({ interviewId: 1, userId: 1 });
AnswerSchema.index({ userId: 1, createdAt: -1 });
AnswerSchema.index({ interviewId: 1, questionId: 1 }, { unique: true }); // one answer per question per interview
AnswerSchema.index({ processingStatus: 1 }); // for AI processing queue

module.exports = mongoose.model('Answer', AnswerSchema);