const Interviewer = require('../models/Interviewer');
const aiServiceClient = require('./aiServiceClient');
const logger = require('../config/logger');

/**
 * Fetch the interviewer's target profile details and generate the next vetting question.
 */
async function getNextVettingQuestion(userId, conversation) {
  const profile = await Interviewer.findOne({ userId });
  if (!profile) throw new Error('Interviewer profile not found');

  const profileData = {
    bio: profile.bio || '',
    domains: profile.domains || [],
    skills: profile.skills || [],
    roles: profile.roles || [],
  };

  const response = await aiServiceClient.generateVettingQuestion(profileData, conversation);
  return response.question;
}

/**
 * Perform final AI grading on the conversation history and update verification flags.
 */
async function runFinalEvaluation(userId, conversation) {
  const profile = await Interviewer.findOne({ userId });
  if (!profile) throw new Error('Interviewer profile not found');

  const profileData = {
    bio: profile.bio || '',
    domains: profile.domains || [],
    skills: profile.skills || [],
    roles: profile.roles || [],
  };

  const response = await aiServiceClient.evaluateVetting(profileData, conversation);
  const evaluation = response.result; // contains score, feedback, decision

  // Save the conversation history and metrics
  profile.vettingScore = evaluation.score;
  profile.vettingConversation = conversation;
  
  if (evaluation.decision === 'approved' && evaluation.score >= 70) {
    profile.vettingStatus = 'approved';
    profile.isVerified = true;
    profile.isAcceptingBookings = true;
  } else {
    profile.vettingStatus = 'rejected';
    profile.isVerified = false;
    profile.isAcceptingBookings = false;
  }

  await profile.save();
  return {
    score: evaluation.score,
    feedback: evaluation.feedback,
    decision: evaluation.decision,
    isVerified: profile.isVerified,
  };
}

module.exports = {
  getNextVettingQuestion,
  runFinalEvaluation,
};
