/**
 * =============================================================================
 * NLP SERVICE — Real AI Integration
 * =============================================================================
 *
 * Calls the Python AI Gateway's /api/ai/analyze-nlp endpoint
 * to evaluate answer quality using Sentence-BERT semantic similarity.
 *
 * Falls back to placeholder scoring when USE_REAL_AI is false or
 * the AI Gateway is unreachable.
 * =============================================================================
 */

const logger = require('../config/logger');

// AI Gateway base URL from environment
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
/** When unset, real AI is ON. Set USE_REAL_AI=false to force heuristics only. */
const USE_REAL_AI = !['false', '0', 'no'].includes(
  String(process.env.USE_REAL_AI || 'true').toLowerCase()
);

/**
 * Analyze text content using NLP / Sentence-BERT
 *
 * @param {Object} params
 * @param {string} params.text          – User's answer (or transcribed text)
 * @param {string} [params.reference]   – Expected/reference answer for comparison
 * @param {string} [params.question]    – The question asked (lets the AI force a
 *                                        score of 0 when the answer just repeats it)
 * @returns {Promise<Object>}           – { score, metrics, feedback }
 */
async function analyzeContent({ text, reference = '', question = '' }) {
  if (!text || text.trim().length === 0) {
    return _emptyResult('No text provided for NLP analysis.');
  }

  // -----------------------------------------------------------------------
  // Try real AI service first (if enabled)
  // -----------------------------------------------------------------------
  if (USE_REAL_AI) {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/analyze-nlp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_answer: text,
          reference_answer: reference,
          question_text: question,
        }),
        signal: AbortSignal.timeout(30000), // 30-second timeout
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          logger.info(`NLP AI analysis completed: score=${result.score}`);
          return {
            score: Math.round(result.score),
            metrics: {
              relevance: Math.round(result.score),
              completeness: _estimateCompleteness(text),
              coherence: _estimateCoherence(text),
              wordCount: text.split(/\s+/).length,
            },
            feedback: {
              summary: result.feedback || 'Answer analyzed successfully.',
              strengths: _generateStrengths(result.score),
              improvements: _generateImprovements(result.score),
            },
          };
        }
      }
      logger.warn('NLP AI returned non-success, falling back to heuristic');
    } catch (error) {
      logger.warn(`NLP AI service unreachable: ${error.message}. Using heuristic.`);
    }

    // Real-AI mode: do not fabricate an NLP score when service is unavailable.
    return {
      score: 0,
      metrics: {
        relevance: 0,
        completeness: 0,
        coherence: 0,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      },
      feedback: {
        summary: 'NLP evaluation service is unavailable right now.',
        strengths: [],
        improvements: ['Try again after AI services are fully loaded.'],
      },
    };
  }

  // -----------------------------------------------------------------------
  // Fallback: Heuristic-based analysis
  // -----------------------------------------------------------------------
  return _heuristicAnalysis(text);
}

// =========================================================================
// Heuristic / Fallback Analysis
// =========================================================================

function _heuristicAnalysis(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;

  // Length score — 20-200 words is ideal
  let lengthScore = wordCount < 10 ? 20 : wordCount < 20 ? 45 : wordCount < 50 ? 65 : wordCount < 200 ? 80 : 70;

  // Sentence complexity — avg 10-20 words is good
  let complexityScore =
    avgSentenceLength >= 10 && avgSentenceLength <= 20
      ? 85
      : avgSentenceLength < 10
        ? 60
        : 65;

  const overallScore = Math.round(lengthScore * 0.4 + complexityScore * 0.6);

  return {
    score: overallScore,
    metrics: {
      relevance: overallScore,
      completeness: _estimateCompleteness(text),
      coherence: _estimateCoherence(text),
      wordCount,
    },
    feedback: {
      summary:
        overallScore >= 75
          ? 'Good answer with solid structure and detail.'
          : overallScore >= 50
            ? 'Decent answer but could benefit from more detail and examples.'
            : 'Answer needs more substance. Try to provide specific examples.',
      strengths: _generateStrengths(overallScore),
      improvements: _generateImprovements(overallScore),
    },
  };
}

// =========================================================================
// Helper Functions
// =========================================================================

function _emptyResult(message) {
  return {
    score: 0,
    metrics: { relevance: 0, completeness: 0, coherence: 0, wordCount: 0 },
    feedback: { summary: message, strengths: [], improvements: ['Provide a complete answer.'] },
  };
}

function _estimateCompleteness(text) {
  const words = text.split(/\s+/).length;
  if (words > 100) return 85;
  if (words > 50) return 70;
  if (words > 20) return 55;
  return 30;
}

function _estimateCoherence(text) {
  const transitions = [
    'however', 'therefore', 'additionally', 'moreover',
    'furthermore', 'first', 'second', 'finally', 'because',
    'although', 'while', 'for example', 'in conclusion',
  ];
  const lower = text.toLowerCase();
  const found = transitions.filter(t => lower.includes(t)).length;
  return Math.min(90, 40 + found * 10);
}

function _generateStrengths(score) {
  if (score >= 80) return ['Strong, relevant answer', 'Good depth of explanation'];
  if (score >= 60) return ['Addresses the main topic', 'Shows understanding'];
  return ['Attempted an answer'];
}

function _generateImprovements(score) {
  if (score >= 80) return ['Minor polishing could help'];
  if (score >= 60) return ['Add more specific examples', 'Expand on key points'];
  return ['Provide more detail', 'Use examples to support your answer', 'Structure your response better'];
}

module.exports = { analyzeContent };
