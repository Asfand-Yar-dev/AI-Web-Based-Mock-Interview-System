/**
 * Live AI Service — async pipeline for the recorded session
 * ---------------------------------------------------------
 * After the live interview ends, the recorded video is uploaded to cloud
 * storage and this service queues an asynchronous analysis job on the
 * Python AI gateway. The gateway later POSTs back to
 * /api/webhooks/ai-analysis-complete with the structured report.
 *
 * Source: Doc/premium_live_interview_architecture.md §3 Step 4 + §5.1
 */

const logger = require('../config/logger');
const LiveBooking = require('../models/LiveBooking');
const { LIVE_BOOKING_STATUS, LIVE_INTERVIEW } = require('../config/constants');

const AI_GATEWAY_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Send the recording URL to the AI gateway for asynchronous analysis.
 * Updates the booking to `evaluating_ai` and records the job id.
 */
async function queueLiveAnalysis(bookingId) {
  const booking = await LiveBooking.findById(bookingId);
  if (!booking) throw new Error(`LiveBooking ${bookingId} not found`);
  if (!booking.recordingUrl) throw new Error(`LiveBooking ${bookingId} has no recordingUrl`);

  booking.status = LIVE_BOOKING_STATUS.EVALUATING_AI;
  booking.aiQueuedAt = new Date();
  booking.aiAttempts = (booking.aiAttempts || 0) + 1;
  await booking.save();

  try {
    const res = await fetch(`${AI_GATEWAY_URL}/api/ai/analyze-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id:    String(booking._id),
        recording_url: booking.recordingUrl,
        // Interview context — used by AI gateway for NLP evaluation
        role:   booking.role   || '',
        domain: booking.domain || '',
        skills: booking.skills || [],
        callback_url:    `${process.env.PUBLIC_APP_URL || 'http://localhost:5000'}/api/webhooks/ai-analysis-complete`,
        callback_secret: process.env.AI_WEBHOOK_SECRET || '',
        timeout_minutes: LIVE_INTERVIEW.AI_PIPELINE_TIMEOUT_MINUTES,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI gateway responded ${res.status}: ${text}`);
    }

    const data = await res.json();
    booking.aiJobId = data.job_id || data.jobId || null;
    await booking.save();
    logger.info(`Live AI analysis queued for booking ${bookingId} → job ${booking.aiJobId}`);
    return booking;
  } catch (err) {
    logger.error(`queueLiveAnalysis failed for booking ${bookingId}: ${err.message}`);
    booking.aiFailedReason = err.message;
    await booking.save();
    throw err;
  }
}

/**
 * Persist the AI report received via webhook and advance status if both
 * AI + human pieces are now in (Architecture §3 Step 5 — Feedback Lock).
 *
 * If the candidate accumulated real-time face scores during the call those
 * are averaged and blended (50/50) with the recording-based facial score
 * so the final figure reflects both in-call expressions AND post-call video.
 */
async function applyAiReport(bookingId, report) {
  const booking = await LiveBooking.findById(bookingId);
  if (!booking) throw new Error(`LiveBooking ${bookingId} not found`);

  // ── Blend real-time facial scores into the report ──────────────────────────
  // The analyze-video pipeline stores the facial score at report.facial.overall_score.
  // We merge real-time captures (taken during the call) with the recording-based score.
  const merged = { ...(report || {}) };
  const rtScores = booking.realtimeFaceScores || [];
  if (rtScores.length > 0) {
    const rtAvg = Math.round(rtScores.reduce((s, e) => s + e.score, 0) / rtScores.length);
    const recordingFacial =
      typeof merged?.facial?.overall_score === 'number' ? merged.facial.overall_score : null;

    const blended = recordingFacial != null
      ? Math.round((rtAvg + recordingFacial) / 2)   // 50% real-time + 50% recording
      : rtAvg;                                        // recording score absent — use real-time only

    merged.realtime_face_score   = rtAvg;
    merged.realtime_face_samples = rtScores.length;
    // Patch both the nested facial object and the top-level facial_score field
    merged.facial       = { ...(merged.facial || {}), overall_score: blended };
    merged.facial_score = blended;

    logger.info(
      `[applyAiReport] booking=${bookingId} ` +
      `rt_avg=${rtAvg} (${rtScores.length} samples) ` +
      `recording=${recordingFacial} → blended=${blended}`
    );
  }

  booking.aiReport = merged;
  booking.aiCompletedAt = new Date();
  booking.aiFailedReason = undefined;

  if (booking.canPublishResults()) {
    booking.status = LIVE_BOOKING_STATUS.RESULTS_READY;
  }

  await booking.save();
  return booking;
}

/**
 * Mark a booking as "AI failed but proceed with human feedback only".
 * Triggered after retries are exhausted (§5.1).
 */
async function markAiFailed(bookingId, reason) {
  const booking = await LiveBooking.findById(bookingId);
  if (!booking) return null;
  booking.aiFailedReason = reason;
  if (booking.humanScore != null && booking.humanFeedback) {
    booking.status = LIVE_BOOKING_STATUS.RESULTS_READY;
  }
  await booking.save();
  return booking;
}

module.exports = {
  queueLiveAnalysis,
  applyAiReport,
  markAiFailed,
};
