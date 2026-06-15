/**
 * Models Index
 * Central export for all database models
 */

const User = require('./User');
const Profile = require('./Profile');
const InterviewSession = require('./InterviewSession');
const Question = require('./Question');
const Answer = require('./Answer');
const AnswerAnalysis = require('./AnswerAnalysis');
const Result = require('./Result');
const InterviewQuestion = require('./InterviewQuestion');
const NLPEvaluation = require('./NLPEvaluation');
const FacialAnalysis = require('./FacialAnalysis');
const VocalAnalysis = require('./VocalAnalysis');
const Interviewer = require('./Interviewer');
const UserInterviewerSelection = require('./InterviewerSelection');
const Schedule = require('./Schedule');
const PaymentDetails = require('./PaymentDetails');

// ── Premium Live Interview ─────────────────────────────────────────────────────
const LiveBooking = require('./LiveBooking');

module.exports = {
  User,
  Profile,
  InterviewSession,
  Question,
  Answer,
  AnswerAnalysis,
  Result,
  InterviewQuestion,
  NLPEvaluation,
  FacialAnalysis,
  VocalAnalysis,
  // Premium: human interviewer profile (replaces old AI-interviewer stub)
  Interviewer,
  UserInterviewerSelection,
  Schedule,
  PaymentDetails,
  // Premium: live booking lifecycle
  LiveBooking,
};

