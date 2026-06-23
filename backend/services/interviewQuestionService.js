/**
 * InterviewQuestionService
 * =========================
 * Strictly generates session-linked interview questions using the Python AI gateway (Gemini).
 *
 * Requirements from user:
 * - Questions must come from Gemini (Gemini-only).
 * - Must respect job role + selected skills.
 * - Must respect interview type (technical / behavioral / mixed).
 * - Do NOT add custom/heuristic questions and do NOT fall back to the question bank.
 */

const mongoose = require('mongoose');
const InterviewQuestion = require('../models/InterviewQuestion');
const Question = require('../models/Question');
const InterviewSession = require('../models/InterviewSession');
const { DIFFICULTY_LEVELS } = require('../config/constants');
const logger = require('../config/logger');

function normalizeDifficulty(session) {
  const d = String(session.difficulty || 'medium').toLowerCase();
  if (d === DIFFICULTY_LEVELS.EASY) return DIFFICULTY_LEVELS.EASY;
  if (d === DIFFICULTY_LEVELS.HARD) return DIFFICULTY_LEVELS.HARD;
  return DIFFICULTY_LEVELS.MEDIUM;
}

function cleanQuestion(q) {
  if (!q) return '';
  if (typeof q === 'string') return q.trim();
  const text = q.text || q.question || '';
  return String(text).trim();
}

function toCategoryForSession(sessionType) {
  if (sessionType === 'behavioral') return 'behavioral';
  return 'technical';
}

/**
 * Populate InterviewQuestion rows for the session using ONLY Gemini.
 *
 * @param {import('mongoose').Document} session - InterviewSession document
 * @param {number} targetCount - Total number of questions expected by the frontend
 * @returns {Promise<{ usedAI: boolean, count: number }>}
 */
async function populateInterviewQuestions(session, targetCount = 5) {
  if (!session || !session._id) throw new Error('Interview session is required');
  if (!targetCount || targetCount < 1) throw new Error('targetCount must be >= 1');

  const sessionType = String(session.session_type || 'general').toLowerCase();

  const jobTitle = session.jobTitle || 'Software Developer';
  const skillsArr = Array.isArray(session.skills) ? session.skills : [];
  const jobDescription = session.jobDescription ? String(session.jobDescription) : '';

  // Gateway uses tech_stack string for context; include skills and jobDescription.
  const techStackBase = skillsArr.join(', ');
  const techStack = jobDescription
    ? `${techStackBase}${techStackBase ? '; ' : ''}${jobDescription}`
    : techStackBase;

  const difficulty = normalizeDifficulty(session);

  // Decide how the requested targetCount splits between technical (main) and
  // behavioral (soft) questions based on the session type. The gateway now lets
  // us control both the main count (num_questions) and the soft count (num_soft_skills).
  let mainCount = 0;
  let softCount = 0;

  if (sessionType === 'technical') {
    mainCount = targetCount;
    softCount = 0;
  } else if (sessionType === 'behavioral') {
    mainCount = 0;
    softCount = targetCount;
  } else {
    // mixed: up to 5 technical questions, remainder behavioral.
    mainCount = Math.min(5, targetCount);
    softCount = Math.max(0, targetCount - mainCount);
  }

  const includeSoftSkills = softCount > 0;
  const numSoftSkills = softCount;
  // The gateway always runs the main generator; request at least 1 to avoid a
  // degenerate prompt even when this session type ignores main questions.
  const numQuestions = Math.max(1, mainCount);

  const aiServiceClient = require('./aiServiceClient');
  const res = await aiServiceClient.generateQuestions(jobTitle, techStack, difficulty, {
    includeSoftSkills,
    numSoftSkills,
    numQuestions,
  });

  if (!res || res.status !== 'success') {
    throw new Error(res?.message || 'AI gateway failed to generate questions');
  }

  const mainQuestionsRaw = Array.isArray(res.questions) ? res.questions : [];
  const softQuestionsRaw = Array.isArray(res.soft_skills_questions)
    ? res.soft_skills_questions
    : [];

  // Clean + filter short items (gateway is supposed to return high-quality questions anyway)
  const mainQuestions = mainQuestionsRaw.map(cleanQuestion).filter((x) => x.length >= 10);
  const softQuestions = softQuestionsRaw.map(cleanQuestion).filter((x) => x.length >= 10);

  const mainSel = mainQuestions.slice(0, mainCount);
  const softSel = softQuestions.slice(0, softCount);

  const selectedQuestions = [...mainSel, ...softSel];
  const categories = [
    ...mainSel.map(() => 'technical'),
    ...softSel.map(() => 'behavioral'),
  ];

  if (selectedQuestions.length !== targetCount) {
    // Gemini-only requirement: do not fill remaining slots from DB or heuristics.
    throw new Error(
      `Gemini returned ${selectedQuestions.length} questions, expected ${targetCount}.`
    );
  }

  // Remove existing linked questions for this interview (if any),
  // so retries/restarts don't duplicate join rows.
  await InterviewQuestion.deleteMany({ interviewId: session._id });

  // Create new question docs + join rows.
  const createdQuestionIds = [];
  let order = 1;
  for (let i = 0; i < selectedQuestions.length; i++) {
    const questionText = selectedQuestions[i];
    const category = categories[i] || toCategoryForSession(sessionType);

    const questionDoc = await Question.create({
      questionText,
      category,
      difficulty,
      skills: skillsArr,
      isAIGenerated: true,
      timeLimit: 120,
    });

    await InterviewQuestion.create({
      interviewId: session._id,
      questionId: questionDoc._id,
      order: order++,
      status: 'pending',
    });

    createdQuestionIds.push(questionDoc._id);
  }

  session.total_questions = targetCount;
  await session.save();

  logger.info(
    `Interview ${session._id}: populated ${targetCount} Gemini questions (type=${sessionType})`
  );

  return { usedAI: true, count: targetCount };
}

module.exports = { populateInterviewQuestions };

