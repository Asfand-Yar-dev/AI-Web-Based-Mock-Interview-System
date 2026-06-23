const express = require('express');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const Interviewer = require('../models/Interviewer');
const vettingService = require('../services/vettingService');
const { HTTP_STATUS } = require('../config/constants');

const router = express.Router();

/**
 * GET /api/vetting/status
 * Retrieve the current interviewer's vetting status, scorecard, and conversation.
 */
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const profile = await Interviewer.findOne({ userId: req.user.id });
  if (!profile) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interviewer profile not found');
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      isVerified: profile.isVerified,
      vettingStatus: profile.vettingStatus,
      vettingScore: profile.vettingScore,
      vettingConversation: profile.vettingConversation,
    }
  });
}));

/**
 * POST /api/vetting/start
 * Reset previous state and initialize a new AI Vetting session with the first question.
 */
router.post('/start', authenticate, asyncHandler(async (req, res) => {
  const profile = await Interviewer.findOne({ userId: req.user.id });
  if (!profile) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interviewer profile not found');

  profile.vettingStatus = 'interviewing';
  profile.vettingScore = 0;
  profile.vettingConversation = [];
  
  // Generate first question
  const firstQuestion = await vettingService.getNextVettingQuestion(req.user.id, []);
  
  // Store first assistant message
  profile.vettingConversation.push({
    role: 'assistant',
    content: firstQuestion,
    timestamp: new Date()
  });
  
  await profile.save();
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      vettingStatus: profile.vettingStatus,
      vettingConversation: profile.vettingConversation,
    }
  });
}));

/**
 * POST /api/vetting/message
 * Accept user's chat input, push to history, and reply with the next question OR grade the final results.
 */
router.post('/message', authenticate, asyncHandler(async (req, res) => {
  const { message, wasPasted, skipped } = req.body;
  const isSkip = Boolean(skipped);

  // A real answer is required unless the candidate explicitly skips.
  if (!isSkip && (!message || message.trim().length < 15)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Please write a complete answer (at least 15 characters), or use Skip if you cannot answer.'
    );
  }

  const profile = await Interviewer.findOne({ userId: req.user.id });
  if (!profile) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interviewer profile not found');

  if (profile.vettingStatus !== 'interviewing') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No active vetting interview in progress');
  }

  // Push user answer. Flag pasted answers (copy-paste from an AI assistant) and skips.
  profile.vettingConversation.push({
    role: 'user',
    content: isSkip ? '[Skipped]' : message.trim(),
    pasted: !isSkip && Boolean(wasPasted),
    skipped: isSkip,
    timestamp: new Date()
  });

  // Count candidate answers
  const userAnswersCount = profile.vettingConversation.filter(m => m.role === 'user').length;

  // We set a threshold of 10 question-answer rounds
  if (userAnswersCount >= 10) {
    // Run final evaluation and save verification flags
    const evaluation = await vettingService.runFinalEvaluation(req.user.id, profile.vettingConversation);
    
    // Refresh local profile ref to send latest state
    const updatedProfile = await Interviewer.findOne({ userId: req.user.id });
    
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        isCompleted: true,
        vettingStatus: updatedProfile.vettingStatus,
        vettingScore: updatedProfile.vettingScore,
        isVerified: updatedProfile.isVerified,
        summary: evaluation.summary,
        mistakes: evaluation.mistakes,
        strengths: evaluation.strengths,
        aiGeneratedSuspected: evaluation.aiGeneratedSuspected,
        audit: evaluation.audit,
        vettingConversation: updatedProfile.vettingConversation,
      }
    });
  } else {
    // Generate next vetting question
    const nextQuestion = await vettingService.getNextVettingQuestion(req.user.id, profile.vettingConversation);
    
    profile.vettingConversation.push({
      role: 'assistant',
      content: nextQuestion,
      timestamp: new Date()
    });
    
    await profile.save();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        isCompleted: false,
        vettingStatus: profile.vettingStatus,
        vettingConversation: profile.vettingConversation,
      }
    });
  }
}));

module.exports = router;
