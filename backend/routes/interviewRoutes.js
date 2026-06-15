/**
 * =============================================================================
 * INTERVIEW ROUTES
 * =============================================================================
 * 
 * Handles interview session management and answer uploads.
 * 
 * ENDPOINTS:
 *   POST   /api/interviews/start              - Start new interview
 *   GET    /api/interviews/my-sessions         - List user's interviews (paginated)
 *   GET    /api/interviews/:sessionId          - Get specific interview
 *   PATCH  /api/interviews/:sessionId          - Update interview session  
 *   DELETE /api/interviews/:sessionId          - Delete interview session
 *   POST   /api/interviews/:sessionId/answers  - Submit audio answer
 *   GET    /api/interviews/:sessionId/answers  - Get answers for session
 *   GET    /api/interviews/:sessionId/questions - Get questions for session
 *   PUT    /api/interviews/:sessionId/end      - End interview
 *   PUT    /api/interviews/:sessionId/cancel   - Cancel interview
 *   GET    /api/interviews/:sessionId/results  - Get results with feedback
 *   GET    /api/interviews/user/:userId        - Admin: get user's sessions
 * 
 * @version 2.0.0 (Architecture aligned — all missing endpoints added)
 * =============================================================================
 */

const express = require('express');
const InterviewSession = require('../models/InterviewSession');
const InterviewQuestion = require('../models/InterviewQuestion');
const Answer = require('../models/Answer');
const AnswerAnalysis = require('../models/AnswerAnalysis');
const Question = require('../models/Question');
const { HTTP_STATUS, SESSION_STATUS } = require('../config/constants');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { startInterviewValidation, userIdParamValidation } = require('../middleware/validation');
const logger = require('../config/logger');

// Phase 4 imports
const upload = require('../middleware/uploadMiddleware');
const { submitAnswer, getAnswers } = require('../controllers/answerController');

// Plan guard imports
const { checkSessionLimit, checkDifficultyAccess } = require('../middleware/planGuard');

// Phase 5 imports (AI services — activate when AI microservice is ready)
// const aiServiceClient = require('../services/aiServiceClient');

const router = express.Router();

/**
 * @route   POST /api/interviews/start
 * @desc    Start a new interview session
 * @access  Private
 */
router.post('/start', authenticate, ...startInterviewValidation, checkSessionLimit, checkDifficultyAccess, asyncHandler(async (req, res) => {
  const { session_type, jobTitle, skills, jobDescription, difficulty } = req.body;

  const session = new InterviewSession({
    user_id: req.user.id,
    session_type: session_type || 'general',
    jobTitle: jobTitle || '',
    skills: skills || [],
    jobDescription: jobDescription || '',
    difficulty: difficulty || 'medium',
    status: SESSION_STATUS.ONGOING,
    started_at: new Date()
  });

  await session.save();

  let questionsMeta = { count: 0, usedAI: false };
  const { populateInterviewQuestions } = require('../services/interviewQuestionService');
  const sessionTypeLower = (session_type || 'general').toLowerCase();
  // mixed interview uses 7 total questions; technical/behavioral use 5 total questions.
  const targetCount = sessionTypeLower === 'mixed' ? 7 : 5;
  questionsMeta = await populateInterviewQuestions(session, targetCount);

  logger.info(`Interview session started: ${session._id} for user: ${req.user.id}`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Interview session started',
    data: {
      session,
      questions: {
        total: questionsMeta.count,
        generatedWithAI: questionsMeta.usedAI,
      },
    },
  });
}));

/**
 * @route   GET /api/interviews/my-sessions
 * @desc    Get current user's interview sessions (paginated)
 * @access  Private
 */
router.get('/my-sessions', authenticate, asyncHandler(async (req, res) => {
  const { status, limit = 10, page = 1 } = req.query;

  const query = { user_id: req.user.id };

  if (status && Object.values(SESSION_STATUS).includes(status)) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const sessions = await InterviewSession.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await InterviewSession.countDocuments(query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      sessions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
}));

/**
 * @route   GET /api/interviews/:sessionId
 * @desc    Get a specific interview session
 * @access  Private
 */
router.get('/:sessionId', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: session
  });
}));

/**
 * @route   PATCH /api/interviews/:sessionId
 * @desc    Update an interview session (e.g., jobTitle, skills, difficulty)
 * @access  Private
 * 
 * ARCHITECTURE DOC: PATCH /api/interviews/:id
 */
router.patch('/:sessionId', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  // Only allow updates on non-completed sessions
  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot update a completed session');
  }

  // Allowed updateable fields
  const { session_type, jobTitle, skills, jobDescription, difficulty } = req.body;

  if (session_type) session.session_type = session_type;
  if (jobTitle !== undefined) session.jobTitle = jobTitle;
  if (skills !== undefined) session.skills = skills;
  if (jobDescription !== undefined) session.jobDescription = jobDescription;
  if (difficulty) session.difficulty = difficulty;

  await session.save();

  logger.info(`Interview session updated: ${session._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Interview session updated',
    data: session
  });
}));

/**
 * @route   DELETE /api/interviews/:sessionId
 * @desc    Delete an interview session
 * @access  Private
 * 
 * ARCHITECTURE DOC: DELETE /api/interviews/:id
 */
router.delete('/:sessionId', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  // Don't allow deleting ongoing sessions — must cancel first
  if (session.status === SESSION_STATUS.ONGOING) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot delete an ongoing session. Cancel it first.');
  }

  // IMPORTANT: Collect answer IDs BEFORE deleting answers (for AnswerAnalysis cascade)
  const answerIds = await Answer.find({ interviewId: req.params.sessionId }).distinct('_id');

  // Delete in correct order: analyses → answers → questions → session
  if (answerIds.length > 0) {
    await AnswerAnalysis.deleteMany({ answerId: { $in: answerIds } });
  }
  await Answer.deleteMany({ interviewId: req.params.sessionId });
  await InterviewQuestion.deleteMany({ interviewId: req.params.sessionId });
  await InterviewSession.deleteOne({ _id: req.params.sessionId });

  logger.info(`Interview session deleted: ${req.params.sessionId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Interview session and associated data deleted successfully'
  });
}));

// =====================================================================
// PHASE 4: ANSWER UPLOAD ROUTES
// =====================================================================

/**
 * @route   POST /api/interviews/:sessionId/answers
 * @desc    Submit an audio answer for a specific question in this session
 * @access  Private
 */
router.post(
  '/:sessionId/answers',
  authenticate,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'video', maxCount: 1 },
  ]),
  asyncHandler(submitAnswer)
);

/**
 * @route   GET /api/interviews/:sessionId/answers
 * @desc    Get all answers submitted for this session
 * @access  Private
 */
router.get('/:sessionId/answers', authenticate, asyncHandler(getAnswers));

// =====================================================================
// INTERVIEW QUESTION MANAGEMENT
// =====================================================================

/**
 * @route   GET /api/interviews/:sessionId/questions
 * @desc    Get questions assigned to this interview session
 * @access  Private
 * 
 * ARCHITECTURE DOC: GET /api/interviews/:id/questions
 */
router.get('/:sessionId/questions', authenticate, asyncHandler(async (req, res) => {
  // Verify session belongs to user
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  // Get questions linked to this interview via the join table
  let interviewQuestions = await InterviewQuestion.find({
    interviewId: req.params.sessionId
  })
    .populate('questionId', 'questionText category difficulty skills timeLimit keywords')
    .sort({ order: 1 });

  // Safety: if nothing exists yet (AI/bank failure), populate lazily.
  if (!interviewQuestions || interviewQuestions.length === 0) {
    const { populateInterviewQuestions } = require('../services/interviewQuestionService');
    const sessionType = (session.session_type || 'general').toLowerCase();
    const targetCount = sessionType === 'mixed' ? 7 : 5;

    // Gemini-only: if this fails, surface the failure to the frontend.
    await populateInterviewQuestions(session, targetCount);

    interviewQuestions = await InterviewQuestion.find({
      interviewId: req.params.sessionId
    })
      .populate('questionId', 'questionText category difficulty skills timeLimit keywords')
      .sort({ order: 1 });
  }

  if (!interviewQuestions || interviewQuestions.length === 0) {
    throw new ApiError(
      503,
      'AI question generation failed. Please restart from setup.'
    );
  }

  const questions = interviewQuestions.map(iq => ({
    id: iq.questionId?._id,
    order: iq.order,
    status: iq.status,
    questionText: iq.questionId?.questionText,
    category: iq.questionId?.category,
    difficulty: iq.questionId?.difficulty,
    skills: iq.questionId?.skills,
    timeLimit: iq.questionId?.timeLimit,
  }));

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      sessionId: session._id,
      totalQuestions: questions.length,
      questions
    }
  });
}));

// =====================================================================
// SESSION LIFECYCLE
// =====================================================================

/**
 * @route   PUT /api/interviews/:sessionId/end
 * @desc    End/complete an interview session
 * @access  Private
 */
router.put('/:sessionId/end', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  // Idempotent: if already completed (e.g. race between timer and button), just return success
  if (session.status === SESSION_STATUS.COMPLETED) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Interview session ended',
      data: session
    });
  }

  session.status = SESSION_STATUS.COMPLETED;
  session.ended_at = new Date();
  await session.save(); // pre-save hook auto-calculates duration

  // =========================================================================
  // PHASE 5: Trigger Result Compilation
  // =========================================================================
  const { compileInterviewResult } = require('./resultRoutes');
  const runCompile = () =>
    compileInterviewResult(session._id, req.user.id).catch(err => {
      logger.error(`Result compilation failed for session ${session._id}: ${err.message}`);
    });
  runCompile();
  // Answers may still be processing — retry compilation after AI pipeline finishes
  setTimeout(runCompile, 45000);
  setTimeout(runCompile, 120000);
  // =========================================================================

  logger.info(`Interview session ended: ${session._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Interview session ended',
    data: session
  });
}));

/**
 * @route   PUT /api/interviews/:sessionId/cancel
 * @desc    Cancel an interview session
 * @access  Private
 */
router.put('/:sessionId/cancel', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  if (session.status === SESSION_STATUS.COMPLETED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot cancel a completed session');
  }

  session.status = SESSION_STATUS.CANCELLED;
  session.ended_at = new Date();
  await session.save();

  logger.info(`Interview session cancelled: ${session._id}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Interview session cancelled',
    data: session
  });
}));

/**
 * @route   GET /api/interviews/user/:userId
 * @desc    Get interview sessions for a specific user (Admin only)
 * @access  Private
 */
router.get('/user/:userId', authenticate, ...userIdParamValidation, asyncHandler(async (req, res) => {
  if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Access denied');
  }

  const sessions = await InterviewSession.find({
    user_id: req.params.userId
  }).sort({ createdAt: -1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: sessions
  });
}));

// =====================================================================
// RESULTS
// =====================================================================

/**
 * @route   GET /api/interviews/:sessionId/results
 * @desc    Get interview results with aggregated feedback
 * @access  Private
 * 
 * FIX: Removed hardcoded scores (confidence: 75, clarity: 80, etc.)
 * Now computes scores dynamically from AnswerAnalysis data when available.
 */
router.get('/:sessionId/results', authenticate, asyncHandler(async (req, res) => {
  const session = await InterviewSession.findOne({
    _id: req.params.sessionId,
    user_id: req.user.id
  });

  if (!session) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interview session not found');
  }

  const answers = await Answer.find({
    interviewId: req.params.sessionId,
    userId: req.user.id
  })
    .populate('questionId', 'questionText category difficulty')
    .sort({ createdAt: 1 });

  const answeredQuestions = answers.length;
  const completedAnswers = answers.filter((a) => a.processingStatus === 'completed');
  /** Average evaluation across completed attempts (includes zeros for silent / empty answers). */
  const overallFromAnswers =
    completedAnswers.length > 0
      ? Math.round(
          completedAnswers.reduce((sum, a) => sum + (a.evaluationScore ?? 0), 0) /
            completedAnswers.length
        )
      : 0;

  const answerIds = answers.map((a) => a._id);
  const analyses = await AnswerAnalysis.find({ answerId: { $in: answerIds } });

  const answerById = new Map(answers.map((a) => [a._id.toString(), a]));
  /** Only aggregate AI dimension scores when the answer was actually scored (>0). Avoids `0 || avg` inflation and junk analyses. */
  const scoredAnalysisRows = analyses
    .map((an) => ({
      analysis: an,
      answer: answerById.get(an.answerId.toString()),
    }))
    .filter(
      ({ answer }) =>
        answer &&
        answer.processingStatus === 'completed' &&
        (answer.evaluationScore ?? 0) > 0
    );

  const avgDim = (field) => {
    if (!scoredAnalysisRows.length) return 0;
    const vals = scoredAnalysisRows
      .map(({ analysis }) => analysis[field])
      .filter((v) => v != null && !Number.isNaN(Number(v)));
    if (!vals.length) return 0;
    return Math.round(vals.reduce((s, v) => s + Number(v), 0) / vals.length);
  };

  const confidenceAvg = avgDim('confidenceScore');
  const clarityAvg = avgDim('clarityScore');
  const technicalAvg = avgDim('technicalScore');
  const bodyLanguageAvg = avgDim('bodyLanguageScore');
  const voiceToneAvg = avgDim('voiceToneScore');
  const facePresenceAvg = avgDim('facePresenceRate');

  const allStrengths = [...new Set(scoredAnalysisRows.flatMap(({ analysis: a }) => a.strengths || []))];
  const allImprovements = [...new Set(scoredAnalysisRows.flatMap(({ analysis: a }) => a.improvements || []))];

  const questionFeedback = answers.map((answer, index) => {
    const analysis = analyses.find(a => a.answerId.toString() === answer._id.toString());
    return {
      id: answer._id,
      questionNumber: index + 1,
      question: answer.questionId?.questionText || 'Question not found',
      category: answer.questionId?.category || 'General',
      difficulty: answer.questionId?.difficulty || 'Medium',
      answer: answer.answerText,
      score: answer.evaluationScore || 0,
      feedback: answer.feedback || 'Answer recorded successfully. AI analysis pending.',
      strengths: analysis?.strengths || [],
      improvements: analysis?.improvements || [],
    };
  });

  const hasScoredAnswers = scoredAnalysisRows.length > 0;

  // Consider still-processing if: session ended recently (< 3 min) and no answers
  // have completed yet — catches the edge-case where the page loads before DB writes land.
  const sessionAge = session.ended_at
    ? (Date.now() - new Date(session.ended_at).getTime()) / 1000
    : Infinity;
  const isStillProcessing =
    completedAnswers.length < answeredQuestions ||
    (answeredQuestions === 0 && sessionAge < 180);

  const results = {
    sessionId: session._id,
    status: session.status,
    sessionType: session.session_type,
    jobTitle: session.jobTitle,
    difficulty: session.difficulty,
    startedAt: session.started_at,
    completedAt: session.ended_at,
    duration: session.duration,
    /** Prefer live average from answer rows; never substitute category averages into overall. */
    overallScore: answeredQuestions > 0 ? overallFromAnswers : 0,
    totalQuestions: session.total_questions || answeredQuestions,
    questionsAnswered: answeredQuestions,
    isProcessing: isStillProcessing,
    hasEvaluatedAnswers: hasScoredAnswers,
    scores: {
      overall: answeredQuestions > 0 ? overallFromAnswers : 0,
      confidence: confidenceAvg,
      clarity: clarityAvg,
      technical: technicalAvg,
      bodyLanguage: bodyLanguageAvg,
      voiceTone: voiceToneAvg,
      facePresence: facePresenceAvg,
    },
    questionFeedback,
    summary:
      answeredQuestions === 0
        ? 'No answers were recorded for this session. Complete and submit answers to receive a meaningful score.'
        : !hasScoredAnswers
          ? 'Your answers were recorded but did not contain enough speech for a full evaluation. Try again with clearer audio.'
          : `You completed ${answeredQuestions} answer(s) in this ${session.session_type || 'interview'} session.`,
    strengths: hasScoredAnswers
      ? allStrengths.length > 0
        ? allStrengths
        : ['Keep practicing with full spoken responses']
      : ['Submit spoken answers so the AI can score your performance'],
    improvements: hasScoredAnswers
      ? allImprovements.length > 0
        ? allImprovements
        : ['Review feedback for each question']
      : ['Enable your microphone and speak for at least a few seconds per question'],
  };

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: results
  });
}));

module.exports = router;