/**
 * =============================================================================
 * AI SERVICE CLIENT — HTTP Client for Python AI Gateway
 * =============================================================================
 *
 * Provides a resilient HTTP client for communicating with the Python AI
 * Gateway (Flask). Features:
 *   - Circuit breaker pattern (auto-disables after consecutive failures)
 *   - Exponential backoff on retries
 *   - Configurable timeouts
 *   - Health-check endpoint for monitoring
 *
 * The client communicates with ALL AI endpoints through a single gateway:
 *   - Speech-to-Text (Whisper)
 *   - NLP Analysis (Sentence-BERT)
 *   - Vocal Analysis (Wav2Vec2)
 *   - Facial Analysis (DeepFace)
 *   - Question Generation (Gemini)
 *   - Answer Feedback (Gemini)
 *   - Comprehensive Analysis (All-in-One)
 *   - Fusion Engine
 *
 * Configuration (via .env):
 *   AI_SERVICE_URL        – Base URL of the Python AI Gateway  (default: http://localhost:8000)
 *   AI_SERVICE_TIMEOUT    – Request timeout in ms               (default: 30000)
 *   AI_SERVICE_MAX_RETRIES – Max retry attempts                 (default: 2)
 *
 * @version 2.0.0
 * =============================================================================
 */

const logger = require('../config/logger');

const BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10);
const MAX_RETRIES = parseInt(process.env.AI_SERVICE_MAX_RETRIES || '2', 10);

// -------------------------------------------------------------------------
// Circuit Breaker State
// -------------------------------------------------------------------------
const circuitBreaker = {
  failures: 0,
  threshold: 5,          // Open circuit after 5 consecutive failures
  resetTimeout: 60000,   // Reset after 60 seconds
  state: 'CLOSED',       // CLOSED | OPEN | HALF_OPEN
  lastFailure: null,
};

function _checkCircuit() {
  if (circuitBreaker.state === 'OPEN') {
    const elapsed = Date.now() - circuitBreaker.lastFailure;
    if (elapsed > circuitBreaker.resetTimeout) {
      circuitBreaker.state = 'HALF_OPEN';
      logger.info('AI Service circuit breaker → HALF_OPEN (testing)');
    } else {
      throw new Error('AI Service circuit breaker is OPEN — service unavailable');
    }
  }
}

function _onSuccess() {
  circuitBreaker.failures = 0;
  if (circuitBreaker.state !== 'CLOSED') {
    circuitBreaker.state = 'CLOSED';
    logger.info('AI Service circuit breaker → CLOSED (recovered)');
  }
}

function _onFailure() {
  circuitBreaker.failures += 1;
  circuitBreaker.lastFailure = Date.now();
  if (circuitBreaker.failures >= circuitBreaker.threshold) {
    circuitBreaker.state = 'OPEN';
    logger.error(
      `AI Service circuit breaker → OPEN after ${circuitBreaker.failures} failures`
    );
  }
}

// -------------------------------------------------------------------------
// Core HTTP helpers
// -------------------------------------------------------------------------

/**
 * Make a JSON POST request to the AI Gateway.
 */
async function _postJSON(endpoint, body, timeout = TIMEOUT) {
  _checkCircuit();

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
      });

      const data = await response.json();
      if (response.ok) {
        _onSuccess();
        return data;
      }

      throw new Error(data.message || `HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        const backoff = Math.pow(2, attempt) * 1000;
        logger.warn(`AI request retry ${attempt + 1} in ${backoff}ms: ${error.message}`);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }

  _onFailure();
  throw lastError;
}

/**
 * Make a multipart/form-data POST request to the AI Gateway.
 */
async function _postForm(endpoint, formData, timeout = TIMEOUT) {
  _checkCircuit();

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(timeout),
      });

      const data = await response.json();
      if (response.ok) {
        _onSuccess();
        return data;
      }

      throw new Error(data.message || `HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        const backoff = Math.pow(2, attempt) * 1000;
        logger.warn(`AI form request retry ${attempt + 1} in ${backoff}ms: ${error.message}`);
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }

  _onFailure();
  throw lastError;
}

// =========================================================================
// PUBLIC API
// =========================================================================

/**
 * Transcribe audio to text (Speech-to-Text via Whisper).
 */
async function transcribeAudio(audioBuffer, filename = 'audio.webm', language = null) {
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  formData.append('audio', blob, filename);
  if (language) formData.append('language', language);

  return _postForm('/api/ai/transcribe', formData, 60000);
}

/**
 * Analyze text with NLP (Sentence-BERT semantic similarity).
 */
async function analyzeNLP(userAnswer, referenceAnswer = '') {
  return _postJSON('/api/ai/analyze-nlp', {
    user_answer: userAnswer,
    reference_answer: referenceAnswer,
  });
}

/**
 * Analyze vocal characteristics from audio.
 */
async function analyzeVoice(audioBuffer, filename = 'audio.webm', quick = true) {
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  formData.append('audio', blob, filename);
  if (quick) formData.append('quick', 'true');

  return _postForm('/api/ai/analyze-voice', formData, 60000);
}

/**
 * Analyze facial expressions from video.
 */
async function analyzeFace(videoBuffer, filename = 'video.webm') {
  const formData = new FormData();
  const blob = new Blob([videoBuffer], { type: 'video/webm' });
  formData.append('video', blob, filename);

  return _postForm('/api/ai/analyze-face', formData, 120000);
}

/**
 * Generate interview questions via Gemini AI.
 */
async function generateQuestions(jobRole, techStack, difficulty = 'Medium', options = {}) {
  return _postJSON('/api/ai/generate-questions', {
    job_role: jobRole,
    tech_stack: techStack,
    difficulty,
    include_soft_skills: options.includeSoftSkills || false,
    num_soft_skills: options.numSoftSkills || 2,
  });
}

/**
 * Generate AI feedback for an answer via Gemini.
 */
async function generateFeedback(question, userAnswer) {
  return _postJSON('/api/ai/generate-feedback', {
    question,
    user_answer: userAnswer,
  });
}

/**
 * Combine voice and facial scores via the Fusion Engine.
 */
async function fuseScores(voiceData, faceData) {
  return _postJSON('/api/ai/fuse-scores', {
    voice_data: voiceData,
    face_data: faceData,
  });
}

/**
 * Comprehensive answer analysis (STT + NLP + Voice in one call).
 */
async function analyzeAnswerComprehensive(audioBuffer, questionText, referenceAnswer = '', filename = 'audio.webm') {
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/webm' });
  formData.append('audio', blob, filename);
  formData.append('question_text', questionText);
  if (referenceAnswer) formData.append('reference_answer', referenceAnswer);

  return _postForm('/api/ai/analyze-answer', formData, 120000);
}

/**
 * Health check — verify AI Gateway is reachable.
 */
async function healthCheck() {
  try {
    const response = await fetch(`${BASE_URL}/api/ai/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    _onSuccess();
    return { available: true, ...data };
  } catch (error) {
    _onFailure();
    return { available: false, error: error.message };
  }
}

/**
 * Get circuit breaker status (for debugging / admin endpoints).
 */
function getCircuitBreakerStatus() {
  return {
    state: circuitBreaker.state,
    failures: circuitBreaker.failures,
    threshold: circuitBreaker.threshold,
    lastFailure: circuitBreaker.lastFailure
      ? new Date(circuitBreaker.lastFailure).toISOString()
      : null,
  };
}

/**
 * Generate next vetting question for interviewer verification.
 */
async function generateVettingQuestion(profile, conversation) {
  return _postJSON('/api/ai/generate-vetting-question', { profile, conversation });
}

/**
 * Perform final evaluation of the vetting conversation transcript.
 */
async function evaluateVetting(profile, conversation) {
  return _postJSON('/api/ai/evaluate-vetting', { profile, conversation });
}

module.exports = {
  transcribeAudio,
  analyzeNLP,
  analyzeVoice,
  analyzeFace,
  generateQuestions,
  generateFeedback,
  fuseScores,
  analyzeAnswerComprehensive,
  generateVettingQuestion,
  evaluateVetting,
  healthCheck,
  getCircuitBreakerStatus,
};
