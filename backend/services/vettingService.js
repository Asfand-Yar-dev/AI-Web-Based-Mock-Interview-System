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
 * Pure scoring function — no DB, no network. Computes the vetting result from
 * the conversation (deterministic signals: skips, pastes) plus the model's
 * content analysis (incorrect/shallow counts, mistakes, strengths).
 *
 * The vetting has a fixed 10 questions, so each question is worth ~10 points.
 * The score is 100 minus itemised deductions, which keeps the on-screen audit
 * perfectly reconciled with the final score.
 *
 * @param {Array} conversation  full vetting transcript ({ role, content, pasted, skipped })
 * @param {Object} evaluation   model output: { incorrect_count, shallow_count, ai_generated_suspected, mistakes[], strengths[], summary }
 */
function computeVettingResult(conversation, evaluation = {}) {
  const userAnswers  = (conversation || []).filter((m) => m.role === 'user');
  const totalAnswers = userAnswers.length || 1;
  const pastedCount  = userAnswers.filter((m) => m.pasted).length;
  const skippedCount = userAnswers.filter((m) => m.skipped).length;

  const pasteSuspected = pastedCount >= 2;                            // a couple of pasted answers is suspicious
  const heavyPaste     = pastedCount >= Math.ceil(totalAnswers / 2);  // half or more pasted → almost certainly AI
  const aiGeneratedSuspected = Boolean(evaluation.ai_generated_suspected) || pasteSuspected;

  // Wrong/shallow counts only apply to answered (non-skipped) questions, and a
  // single answer can't be counted as both incorrect AND shallow.
  const answeredCount  = Math.max(0, totalAnswers - skippedCount);
  const incorrectCount = Math.min(answeredCount, Math.max(0, Number(evaluation.incorrect_count) || 0));
  const shallowCount   = Math.min(answeredCount - incorrectCount, Math.max(0, Number(evaluation.shallow_count) || 0));

  // Each question ≈ 10 points. A wrong answer loses the whole 10; a shallow
  // answer loses most of it. Skipping costs slightly more (12) than an attempt —
  // it shows zero engagement — so skipping 3 of 10 questions fails on its own
  // (3 × 12 = 36 → 64 < 70) even if the model misses other issues. AI/pasted
  // answers are penalised on top.
  const DEDUCT = { ai: heavyPaste || pastedCount >= 5 ? 45 : 25, skip: 12, incorrect: 10, shallow: 6 };
  const audit = [];

  if (aiGeneratedSuspected) {
    audit.push({ reason: 'AI-generated / pasted answers', count: pastedCount || undefined, points: -DEDUCT.ai });
  }
  if (skippedCount > 0) {
    audit.push({ reason: 'Skipped or low-effort answers', count: skippedCount, points: -(skippedCount * DEDUCT.skip) });
  }
  if (incorrectCount > 0) {
    audit.push({ reason: 'Incorrect or inaccurate answers', count: incorrectCount, points: -(incorrectCount * DEDUCT.incorrect) });
  }
  if (shallowCount > 0) {
    audit.push({ reason: 'Shallow or generic answers', count: shallowCount, points: -(shallowCount * DEDUCT.shallow) });
  }

  const totalDeducted = audit.reduce((s, a) => s + a.points, 0);   // negative or 0
  const score = Math.max(0, Math.min(100, 100 + totalDeducted));
  const decision = score >= 70 ? 'approved' : 'rejected';

  // ── Point-by-point report (mistakes + strengths bullets) ────────────────────
  const mistakes = [];
  if (aiGeneratedSuspected) {
    mistakes.push(
      pasteSuspected
        ? `${pastedCount} of ${totalAnswers} answers were pasted in, not written live — they look AI-generated.`
        : `Answers appear AI-generated rather than written in your own words.`
    );
  }
  if (skippedCount > 0) mistakes.push(`${skippedCount} question${skippedCount === 1 ? '' : 's'} skipped or left low-effort.`);
  if (Array.isArray(evaluation.mistakes)) {
    for (const m of evaluation.mistakes) {
      if (typeof m === 'string' && m.trim()) mistakes.push(m.trim());
    }
  }

  const strengths = Array.isArray(evaluation.strengths)
    ? evaluation.strengths.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim())
    : [];

  const summary = String(evaluation.summary || '').trim();

  return { score, decision, aiGeneratedSuspected, audit, mistakes, strengths, summary };
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
  const result = computeVettingResult(conversation, response.result || {});

  // Persist
  profile.vettingScore = result.score;
  profile.vettingConversation = conversation;
  if (result.decision === 'approved') {
    profile.vettingStatus = 'approved';
    profile.isVerified = true;
    profile.isAcceptingBookings = true;
  } else {
    profile.vettingStatus = 'rejected';
    profile.isVerified = false;
    profile.isAcceptingBookings = false;
  }

  await profile.save();
  return { ...result, isVerified: profile.isVerified };
}

module.exports = {
  getNextVettingQuestion,
  runFinalEvaluation,
  computeVettingResult,
};
