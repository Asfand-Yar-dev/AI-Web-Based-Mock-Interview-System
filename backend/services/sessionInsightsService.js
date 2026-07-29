/**
 * =============================================================================
 * SESSION INSIGHTS SERVICE
 * =============================================================================
 *
 * Generates role-grounded, content-specific strengths / areas-to-improve for a
 * completed AI mock-interview session.
 *
 * Instead of templated, score-bucket text ("Strong, relevant answer"), this
 * evaluates the candidate's ACTUAL answers (the full Q&A transcript) against the
 * role and skills they practised for — so the feedback is about their interview
 * performance and their target role, not generic app messaging.
 *
 * Backed by the AI Gateway's /api/ai/evaluate-live-interview endpoint (Groq).
 * Returns null when the gateway is unavailable so callers can fall back to
 * honest messaging rather than fabricated feedback.
 * =============================================================================
 */

const logger = require('../config/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * @param {Object} params
 * @param {string}   params.role        – Role/job title the candidate practised for
 * @param {string[]} [params.skills]    – Skills the session focused on
 * @param {string}   params.transcript  – Full "Q: …\nA: …" transcript of the session
 * @returns {Promise<{ strengths: string[], improvements: string[], summary: string } | null>}
 */
async function generateSessionInsights({ role, skills = [], transcript }) {
  if (!transcript || transcript.trim().length < 20) return null;

  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/ai/evaluate-live-interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: role || 'Software Developer',
        domain: role || 'technology',
        skills: Array.isArray(skills) ? skills : [],
        transcript,
        interviewer_score: 0, // no human score for AI mock interviews
      }),
      signal: AbortSignal.timeout(20000), // Groq is fast — cap at 20s
    });

    if (!res.ok) {
      logger.warn(`[sessionInsights] AI gateway responded ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data.status !== 'success') {
      logger.warn(`[sessionInsights] AI returned non-success: ${data.message}`);
      return null;
    }

    const clean = (arr) =>
      Array.isArray(arr)
        ? arr.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()).slice(0, 5)
        : [];

    const strengths = clean(data.strengths);
    const improvements = clean(data.improvements);
    const summary = typeof data.summary === 'string' ? data.summary.trim() : '';

    // Nothing usable came back — let the caller fall back.
    if (!strengths.length && !improvements.length) return null;

    return { strengths, improvements, summary };
  } catch (err) {
    logger.warn(`[sessionInsights] generation failed: ${err.message}`);
    return null;
  }
}

/**
 * Generate the ideal/correct answer to a single interview question, grounded in
 * the role and skills. Used to show the applicant what a good answer looks like
 * when their own answer scored as wrong. Returns '' when unavailable.
 *
 * @param {Object} params
 * @param {string}   params.question
 * @param {string}   [params.role]
 * @param {string[]} [params.skills]
 * @returns {Promise<string>}
 */
async function generateModelAnswer({ question, role = '', skills = [] }) {
  if (!question || !question.trim()) return '';
  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/ai/model-answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        role: role || '',
        skills: Array.isArray(skills) ? skills : [],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      logger.warn(`[modelAnswer] AI gateway responded ${res.status}`);
      return '';
    }
    const data = await res.json();
    if (data.status !== 'success' || typeof data.answer !== 'string') {
      logger.warn(`[modelAnswer] non-success: ${data.message}`);
      return '';
    }
    return data.answer.trim();
  } catch (err) {
    logger.warn(`[modelAnswer] generation failed: ${err.message}`);
    return '';
  }
}

module.exports = { generateSessionInsights, generateModelAnswer };
