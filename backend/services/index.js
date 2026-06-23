/**
 * =============================================================================
 * AI SERVICES INDEX — Orchestration Layer
 * =============================================================================
 *
 * Central orchestrator for all AI analysis services.
 * 
 * This module:
 *   1. Imports NLP, Vocal, and Facial services
 *   2. Provides analyzeAnswer() which runs all analyses concurrently
 *   3. Saves AnswerAnalysis records to the database
 *   4. Calculates composite scores
 *
 * Each individual service handles its own fallback to heuristic scoring
 * when the Python AI Gateway is unavailable.
 * =============================================================================
 */

const nlpService = require('./nlpService');
const vocalService = require('./vocalService');
const facialService = require('./facialService');
const logger = require('../config/logger');

/**
 * Run all AI analyses concurrently on a submitted answer.
 *
 * @param {Object} params
 * @param {string} params.text         – Answer text or transcribed speech
 * @param {string} [params.reference]  – Reference answer for NLP comparison
 * @param {string} [params.audioUrl]   – Path/URL to audio file
 * @param {Buffer} [params.audioBuffer] – Raw audio buffer
 * @param {string} [params.videoUrl]   – Path/URL to video file
 * @param {Buffer} [params.videoBuffer] – Raw video buffer
 * @param {string} [params.filename]   – Original filename
 * @returns {Promise<Object>}
 */
async function analyzeAnswer({ text, reference, question, audioUrl, audioBuffer, videoUrl, videoBuffer, filename }) {
  const results = {
    nlp: null,
    vocal: null,
    facial: null,
    overallScore: 0,
    timestamp: new Date().toISOString(),
  };

  // Run analyses concurrently. Facial analysis is conditional on actual video input.
  const jobs = [
    nlpService.analyzeContent({ text, reference, question }),
    vocalService.analyzeVocal({ audioUrl, audioBuffer, filename }),
  ];
  const hasVideo = Boolean(videoBuffer || videoUrl);
  if (hasVideo) {
    jobs.push(facialService.analyzeFacial({ videoUrl, videoBuffer, filename }));
  }

  const settled = await Promise.allSettled(jobs);
  const nlpResult = settled[0];
  const vocalResult = settled[1];
  const facialResult = hasVideo ? settled[2] : null;

  // Extract results (default to null on rejection)
  results.nlp = nlpResult.status === 'fulfilled' ? nlpResult.value : null;
  results.vocal = vocalResult.status === 'fulfilled' ? vocalResult.value : null;
  results.facial =
    facialResult && facialResult.status === 'fulfilled' ? facialResult.value : null;

  // Log any failures
  if (nlpResult.status === 'rejected') {
    logger.error(`NLP analysis failed: ${nlpResult.reason}`);
  }
  if (vocalResult.status === 'rejected') {
    logger.error(`Vocal analysis failed: ${vocalResult.reason}`);
  }
  if (facialResult && facialResult.status === 'rejected') {
    logger.error(`Facial analysis failed: ${facialResult.reason}`);
  }

  // -----------------------------------------------------------------------
  // Calculate overall composite score
  // Weights: NLP (Content) 40%, Vocal 30%, Facial 30%
  // Only score components that actually returned data
  // -----------------------------------------------------------------------
  const components = [];
  if (results.nlp?.score != null) {
    components.push({ score: results.nlp.score, weight: 0.4, label: 'nlp' });
  }
  if (results.vocal?.score != null) {
    components.push({ score: results.vocal.score, weight: 0.3, label: 'vocal' });
  }
  if (results.facial?.score != null) {
    components.push({ score: results.facial.score, weight: 0.3, label: 'facial' });
  }

  if (components.length > 0) {
    // Re-normalise weights so they always sum to 1.0
    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    results.overallScore = Math.round(
      components.reduce((sum, c) => sum + c.score * (c.weight / totalWeight), 0)
    );
  }

  logger.info(
    `Answer analysis complete: overall=${results.overallScore} ` +
    `(nlp=${results.nlp?.score ?? 'N/A'}, vocal=${results.vocal?.score ?? 'N/A'}, ` +
    `facial=${results.facial?.score ?? 'N/A'})`
  );

  return results;
}

/**
 * Save analysis results into the AnswerAnalysis collection.
 *
 * @param {string} answerId     – The Answer document's _id
 * @param {string} interviewId  – The InterviewSession _id
 * @param {string} userId       – The User _id
 * @param {Object} analysis     – Output from analyzeAnswer()
 * @returns {Promise<Object|null>}
 */
async function saveAnalysis(answerId, interviewId, userId, analysis) {
  try {
    const AnswerAnalysis = require('../models/AnswerAnalysis');

    const doc = await AnswerAnalysis.findOneAndUpdate(
      { answerId },
      {
        answerId,
        interviewId,
        userId,
        // Scores
        // confidenceScore → vocal confidence (how assertively the user spoke)
        confidenceScore: analysis.vocal?.metrics?.confidence ?? analysis.nlp?.score ?? 0,
        // clarityScore → answer coherence/structure (text-based), not raw audio clarity.
        // Raw audio clarity from Wav2Vec2 on browser WebM is unreliable and scores too low.
        clarityScore: analysis.nlp?.metrics?.coherence ?? analysis.vocal?.metrics?.clarity ?? 0,
        technicalScore: analysis.nlp?.score ?? 0,
        // bodyLanguageScore: only meaningful when a face was actually detected
        bodyLanguageScore: analysis.facial?.metrics?.bodyLanguage ?? 0,
        voiceToneScore: analysis.vocal?.metrics?.tone ?? 0,
        // Track face presence so the UI can show "Camera Off" for low-presence sessions
        facePresenceRate: analysis.facial?.metrics?.facePresence ?? (analysis.facial ? 100 : 0),
        // Feedback
        strengths: [
          ...(analysis.nlp?.feedback?.strengths || []),
          ...(analysis.vocal?.feedback?.strengths || []),
          ...(analysis.facial?.feedback?.strengths || []),
        ].slice(0, 5),
        improvements: [
          ...(analysis.nlp?.feedback?.improvements || []),
          ...(analysis.vocal?.feedback?.improvements || []),
          ...(analysis.facial?.feedback?.improvements || []),
        ].slice(0, 5),
        // Raw data
        nlpData: analysis.nlp || {},
        vocalData: analysis.vocal || {},
        facialData: analysis.facial || {},
        overallScore: analysis.overallScore,
        analyzedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    logger.info(`AnswerAnalysis saved: ${doc._id} for answer ${answerId}`);
    return doc;
  } catch (error) {
    logger.error(`Failed to save AnswerAnalysis for answer ${answerId}: ${error.message}`);
    return null;
  }
}

module.exports = {
  nlpService,
  vocalService,
  facialService,
  analyzeAnswer,
  saveAnalysis,
};
