/**
 * Live Booking Controller — Premium Live Interview Feature
 * --------------------------------------------------------
 * New 7-stage lifecycle:
 *   pending_approval → accepted → payment_pending → payment_completed
 *   → meeting_scheduled → meeting_started → meeting_completed
 *   pending_approval → rejected
 */

const LiveBooking = require('../models/LiveBooking');
const Interviewer = require('../models/Interviewer');
const User = require('../models/User');
const logger = require('../config/logger');
const { ApiError } = require('../middleware/errorHandler');
const { HTTP_STATUS, LIVE_BOOKING_STATUS, LIVE_INTERVIEW } = require('../config/constants');
const paymentService = require('../services/paymentService');
const liveAiService = require('../services/liveAiService');
const {
  sendBookingConfirmation,
  sendBookingAccepted,
  sendBookingRejected,
  sendNoShowRefund,
  sendResultsReady,
} = require('../config/email');

const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'http://localhost:3000';
const meetingUrlFor = (roomId) => `${PUBLIC_APP_URL}/live-interview/room/${roomId}`;

// ── Real-time helper ───────────────────────────────────────────────────────
// Lazy-require so the controller works even if socket.io isn't installed yet.
function emitBookingChanged(userId) {
  try {
    const { emitToUser } = require('../services/signalingService');
    emitToUser(String(userId), 'booking:changed', {});
  } catch (_) { /* socket.io not installed — silently skip */ }
}

// Emit to both sides of a booking (applicant + interviewer's user account).
async function notifyBothParties(booking) {
  emitBookingChanged(booking.applicantId);
  try {
    const intvProfile = await Interviewer.findById(booking.interviewerId).select('userId').lean();
    if (intvProfile?.userId) emitBookingChanged(intvProfile.userId);
  } catch (_) {}
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function _interviewerIdFor(userId) {
  let profile = await Interviewer.findOne({ userId });
  if (!profile) {
    const user = await User.findById(userId);
    if (user && (user.user_role === 'interviewer' || user.role === 'interviewer')) {
      try {
        profile = await Interviewer.create({
          userId: user._id,
          hourlyRate: 0,
          isAcceptingBookings: false,
          bio: '',
          domains: [],
          skills: [],
          roles: [],
          availability: []
        });
        logger.info(`Auto-created skeleton interviewer profile for user ${userId} on API request.`);
      } catch (err) {
        logger.error(`Failed to auto-create skeleton interviewer profile for user ${userId} on API request: ${err.message}`);
      }
    }
  }
  return profile ? profile._id : null;
}

// ── Controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/bookings/request
 * User manually selects an interviewer and sends a booking request.
 * Status: pending_approval
 */
async function requestBooking(req, res) {
  const { interviewerId, role, skills, domain, scheduledTime, durationMinutes } = req.body;

  if (!role || !domain || !scheduledTime) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'role, domain, and scheduledTime are required');
  }

  const slot = new Date(scheduledTime);
  if (Number.isNaN(slot.getTime()) || slot.getTime() < Date.now() + 5 * 60 * 1000) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'scheduledTime must be at least 5 minutes in the future');
  }

  let finalInterviewerId = interviewerId;

  // Auto-match if interviewerId is not provided or is set to 'auto'
  if (!finalInterviewerId || finalInterviewerId === 'auto') {
    const bookingService = require('../services/bookingService');
    const skillsArray = Array.isArray(skills)
      ? skills
      : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : []);

    const matchedIntv = await bookingService.findMatchingInterviewer({
      role,
      skills: skillsArray,
      domain,
      scheduledTime: slot,
    });

    if (!matchedIntv) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        'No interviewer is available for the requested role, domain, and time. Please pick a different slot.'
      );
    }
    finalInterviewerId = matchedIntv._id;
  }

  // Verify the interviewer exists, is verified, and is accepting bookings
  const interviewer = await Interviewer.findById(finalInterviewerId);
  if (!interviewer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interviewer not found');
  }
  // [VETTING QUARANTINED] verification gate disabled for testing. Restore on request.
  // if (!interviewer.isVerified) {
  //   throw new ApiError(HTTP_STATUS.FORBIDDEN, 'This interviewer is not verified/certified yet');
  // }
  if (!interviewer.isAcceptingBookings) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'This interviewer is not currently accepting bookings');
  }

  // Check for existing conflict in the same time window
  const conflictWindowStart = new Date(slot.getTime() - 60 * 60 * 1000);
  const conflictWindowEnd   = new Date(slot.getTime() + 60 * 60 * 1000);
  const conflict = await LiveBooking.findOne({
    interviewerId: finalInterviewerId,
    scheduledTime: { $gte: conflictWindowStart, $lt: conflictWindowEnd },
    status: { $in: [
      LIVE_BOOKING_STATUS.PENDING_APPROVAL,
      LIVE_BOOKING_STATUS.ACCEPTED,
      LIVE_BOOKING_STATUS.PAYMENT_PENDING,
      LIVE_BOOKING_STATUS.PAYMENT_COMPLETED,
      LIVE_BOOKING_STATUS.MEETING_SCHEDULED,
      LIVE_BOOKING_STATUS.MEETING_STARTED,
    ]},
  });
  if (conflict) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'This interviewer already has a booking near that time slot. Please choose a different time.');
  }

  const booking = await LiveBooking.create({
    applicantId: req.user.id,
    interviewerId: finalInterviewerId,
    role,
    skills: skills || [],
    domain,
    scheduledTime: slot,
    durationMinutes: durationMinutes || LIVE_INTERVIEW.DEFAULT_DURATION_MINUTES,
    status: LIVE_BOOKING_STATUS.PENDING_APPROVAL,
  });

  logger.info(`[booking] New booking ${booking._id} → interviewer ${finalInterviewerId} @ ${scheduledTime} (pending_approval)`);

  // Push real-time notification to the interviewer so the request appears instantly
  notifyBothParties(booking).catch(() => {});

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Booking request sent. Waiting for interviewer approval.',
    data: {
      bookingId: booking._id,
      interviewerId: interviewer._id,
      status: booking.status,
    },
  });
}

/**
 * POST /api/bookings/:id/respond
 * Interviewer accepts or rejects a pending booking request.
 * Body: { action: 'accept' | 'reject', note?: string }
 */
async function respondToBooking(req, res) {
  const booking = await LiveBooking.findById(req.params.id);
  if (!booking) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');

  if (booking.status !== LIVE_BOOKING_STATUS.PENDING_APPROVAL) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Booking is already ${booking.status} — cannot respond again`);
  }

  // Verify caller is the assigned interviewer
  const intvId = await _interviewerIdFor(req.user.id);
  if (!intvId || String(booking.interviewerId) !== String(intvId)) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Only the assigned interviewer can respond to this booking');
  }

  const { action, note } = req.body;
  if (!['accept', 'reject'].includes(action)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'action must be "accept" or "reject"');
  }

  const interviewer = await Interviewer.findById(intvId).populate('userId', 'name email');
  const applicant   = await User.findById(booking.applicantId);

  if (action === 'accept') {
    booking.status = LIVE_BOOKING_STATUS.ACCEPTED;
    await booking.save();

    logger.info(`[booking] ${booking._id} accepted by interviewer ${intvId}`);

    emitBookingChanged(booking.applicantId);

    // Notify the applicant to pay
    const checkoutUrl = `${PUBLIC_APP_URL}/live-interview/checkout/${booking._id}`;
    if (applicant?.email) {
      sendBookingAccepted({
        to: applicant.email,
        role: booking.role,
        interviewerName: interviewer?.userId?.name || 'Your interviewer',
        bookingId: String(booking._id),
        scheduledTime: booking.scheduledTime,
        checkoutUrl,
      }).catch(err => logger.error(`[booking] accept email failed: ${err.message}`));
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Booking accepted. Applicant has been notified to complete payment.',
      data: { bookingId: booking._id, status: booking.status },
    });
  }

  // Reject — record who declined so we never re-offer it to them.
  if (!Array.isArray(booking.declinedInterviewerIds)) booking.declinedInterviewerIds = [];
  if (!booking.declinedInterviewerIds.some(id => String(id) === String(intvId))) {
    booking.declinedInterviewerIds.push(intvId);
  }
  if (note) booking.interviewerNote = note;

  // Try to auto-reassign to another available interviewer in the same domain,
  // skipping everyone who has already declined this booking.
  const bookingService = require('../services/bookingService');
  const nextInterviewer = await bookingService.findMatchingInterviewer({
    role: booking.role,
    skills: booking.skills || [],
    domain: booking.domain,
    scheduledTime: booking.scheduledTime,
    excludeInterviewerIds: booking.declinedInterviewerIds,
  });

  if (nextInterviewer) {
    // Re-offer the request to the new interviewer; it stays pending_approval.
    booking.interviewerId = nextInterviewer._id;
    booking.interviewerNote = undefined; // previous interviewer's note no longer applies
    booking.status = LIVE_BOOKING_STATUS.PENDING_APPROVAL;
    await booking.save();

    logger.info(`[booking] ${booking._id} declined by ${intvId} — reassigned to ${nextInterviewer._id}`);
    emitBookingChanged(booking.applicantId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Booking declined and re-sent to another available interviewer in the same domain.',
      data: { bookingId: booking._id, status: booking.status, reassignedTo: nextInterviewer._id },
    });
  }

  // No other interviewer available — finalise as rejected and notify the applicant.
  booking.status = LIVE_BOOKING_STATUS.REJECTED;
  await booking.save();

  logger.info(`[booking] ${booking._id} rejected by interviewer ${intvId} — no other interviewer available${note ? ` — reason: ${note}` : ''}`);
  emitBookingChanged(booking.applicantId);

  if (applicant?.email) {
    sendBookingRejected({
      to: applicant.email,
      role: booking.role,
      interviewerName: interviewer?.userId?.name || 'The interviewer',
      note,
      browseUrl: `${PUBLIC_APP_URL}/live-interview/book`,
    }).catch(err => logger.error(`[booking] reject email failed: ${err.message}`));
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Booking rejected. No other interviewer was available in this domain.',
    data: { bookingId: booking._id, status: booking.status },
  });
}

/**
 * GET /api/bookings/mine
 * List the requesting user's bookings (as applicant by default,
 * or as interviewer if ?as=interviewer is passed).
 */
async function listMyBookings(req, res) {
  if (req.query.as === 'interviewer') {
    const intvId = await _interviewerIdFor(req.user.id);
    if (!intvId) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        'You do not have an interviewer profile yet. Create one at /live-interview/become-interviewer.'
      );
    }
    const bookings = await LiveBooking.find({ interviewerId: intvId })
      .sort({ scheduledTime: -1 })
      .limit(50)
      .populate('applicantId', 'name email profilePicture');
    return res.status(HTTP_STATUS.OK).json({ success: true, data: bookings });
  }

  const bookings = await LiveBooking.find({ applicantId: req.user.id })
    .sort({ scheduledTime: -1 })
    .limit(50)
    .populate('interviewerId');

  res.status(HTTP_STATUS.OK).json({ success: true, data: bookings });
}

/**
 * GET /api/bookings/:id
 * Booking detail — accessible to applicant and interviewer.
 */
async function getBooking(req, res) {
  const booking = await LiveBooking.findById(req.params.id)
    .populate('interviewerId')
    .populate('applicantId', 'name email profilePicture');
  if (!booking) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');

  const intvId = await _interviewerIdFor(req.user.id);
  if (String(booking.applicantId?._id || booking.applicantId) !== req.user.id &&
      String(booking.interviewerId?._id || booking.interviewerId) !== String(intvId)) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You are not part of this booking');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { booking, meetingUrl: meetingUrlFor(booking.meetingRoomId) },
  });
}

/**
 * POST /api/payments/create-checkout
 * Generates a checkout session for an accepted booking.
 * Booking must be in 'accepted' status.
 */
async function createCheckout(req, res) {
  const { bookingId } = req.body;
  const booking = await LiveBooking.findById(bookingId);
  if (!booking) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');
  if (String(booking.applicantId) !== req.user.id) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Only the applicant can pay for this booking');
  }
  if (booking.status !== LIVE_BOOKING_STATUS.ACCEPTED) {
    if (booking.status === LIVE_BOOKING_STATUS.PENDING_APPROVAL) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Your booking request is still awaiting interviewer approval');
    }
    if (booking.status === LIVE_BOOKING_STATUS.REJECTED) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'This booking was declined by the interviewer');
    }
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Booking is not awaiting payment (current status: ${booking.status})`);
  }

  const [interviewer, applicant] = await Promise.all([
    Interviewer.findById(booking.interviewerId).populate('userId', 'name email'),
    User.findById(booking.applicantId),
  ]);

  const session = await paymentService.createCheckoutSession({ booking, interviewer, applicant });

  booking.paymentId   = session.sessionId;
  booking.amountCents = session.amountCents;
  booking.status      = LIVE_BOOKING_STATUS.PAYMENT_PENDING;

  // ── STUB MODE: flip to payment_completed + meeting_scheduled immediately ──
  if (session.stub) {
    booking.status        = LIVE_BOOKING_STATUS.PAYMENT_COMPLETED;
    booking.paymentStatus = 'paid';
    await booking.save();

    // Small delay then transition to meeting_scheduled
    const meetingUrl = meetingUrlFor(booking.meetingRoomId);

    // Update to meeting_scheduled
    booking.status = LIVE_BOOKING_STATUS.MEETING_SCHEDULED;
    await booking.save();

    // Notify both parties in real time
    notifyBothParties(booking).catch(() => {});

    // Send confirmation emails to both parties
    Promise.all([
      applicant?.email && sendBookingConfirmation({
        to: applicant.email,
        role: booking.role,
        scheduledTime: booking.scheduledTime,
        meetingUrl,
        durationMinutes: booking.durationMinutes,
        booking,
      }),
      interviewer?.userId?.email && sendBookingConfirmation({
        to: interviewer.userId.email,
        role: booking.role,
        scheduledTime: booking.scheduledTime,
        meetingUrl,
        durationMinutes: booking.durationMinutes,
        booking,
      }),
    ]).catch(err => logger.error(`[stub-pay] confirmation email failed: ${err.message}`));
  } else {
    await booking.save();
  }

  res.status(HTTP_STATUS.OK).json({ success: true, data: { url: session.url } });
}

/**
 * POST /api/webhooks/stripe  (raw body required — see route)
 * On checkout.session.completed: payment_completed → meeting_scheduled
 */
async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = paymentService.verifyWebhookSignature(req.body, sig);
  } catch (err) {
    logger.warn(`Stripe webhook signature failure: ${err.message}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session   = event.data.object;
    const bookingId = session.metadata?.bookingId;
    const booking   = bookingId ? await LiveBooking.findById(bookingId) : null;

    if (booking) {
      booking.status        = LIVE_BOOKING_STATUS.MEETING_SCHEDULED;
      booking.paymentStatus = 'paid';
      booking.paymentId     = session.id;
      await booking.save();

      const [applicant, interviewer] = await Promise.all([
        User.findById(booking.applicantId),
        Interviewer.findById(booking.interviewerId).populate('userId'),
      ]);
      const meetingUrl = meetingUrlFor(booking.meetingRoomId);

      Promise.all([
        applicant?.email && sendBookingConfirmation({
          to: applicant.email,
          role: booking.role,
          scheduledTime: booking.scheduledTime,
          meetingUrl,
          durationMinutes: booking.durationMinutes,
          booking,
        }),
        interviewer?.userId?.email && sendBookingConfirmation({
          to: interviewer.userId.email,
          role: booking.role,
          scheduledTime: booking.scheduledTime,
          meetingUrl,
          durationMinutes: booking.durationMinutes,
          booking,
        }),
      ]).catch(err => logger.error(`Booking confirm email failed: ${err.message}`));
    }
  }

  res.json({ received: true });
}

/**
 * POST /api/bookings/:id/join
 * Mark participant as joined; transition to meeting_started when both are in.
 */
async function joinMeeting(req, res) {
  const booking = await LiveBooking.findById(req.params.id);
  if (!booking) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');

  const intvId = await _interviewerIdFor(req.user.id);
  const isApplicant   = String(booking.applicantId) === req.user.id;
  const isInterviewer = intvId && String(booking.interviewerId) === String(intvId);

  if (!isApplicant && !isInterviewer) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You are not part of this booking');
  }

  // [VETTING QUARANTINED] interviewer verification gate disabled for testing.
  // Restore the block below on request.
  // if (isInterviewer) {
  //   const interviewer = await Interviewer.findOne({ userId: req.user.id });
  //   if (!interviewer || !interviewer.isVerified) {
  //     throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You must complete AI Certification Vetting before conducting interviews.');
  //   }
  // }
  if (!['meeting_scheduled', 'meeting_started'].includes(booking.status)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Cannot join — booking is ${booking.status}`);
  }

  const now = new Date();
  if (isApplicant && !booking.applicantJoinedAt)   booking.applicantJoinedAt   = now;
  if (isInterviewer && !booking.interviewerJoinedAt) booking.interviewerJoinedAt = now;

  if (booking.applicantJoinedAt && booking.interviewerJoinedAt &&
      booking.status === LIVE_BOOKING_STATUS.MEETING_SCHEDULED) {
    booking.status         = LIVE_BOOKING_STATUS.MEETING_STARTED;
    booking.meetingStartedAt = now;
  }

  await booking.save();
  notifyBothParties(booking).catch(() => {});
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: { status: booking.status, meetingUrl: meetingUrlFor(booking.meetingRoomId) },
  });
}

/**
 * POST /api/bookings/:id/end
 * Ends the meeting and transitions to meeting_completed.
 */
async function endMeeting(req, res) {
  const booking = await LiveBooking.findById(req.params.id);
  if (!booking) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');

  const intvId = await _interviewerIdFor(req.user.id);
  const isApplicant   = String(booking.applicantId) === req.user.id;
  const isInterviewer = intvId && String(booking.interviewerId) === String(intvId);

  if (!isApplicant && !isInterviewer) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You are not part of this booking');
  }
  if (booking.status !== LIVE_BOOKING_STATUS.MEETING_STARTED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Meeting has not started yet (status: ${booking.status})`);
  }

  booking.status        = LIVE_BOOKING_STATUS.MEETING_COMPLETED;
  booking.meetingEndedAt = new Date();
  await booking.save();
  notifyBothParties(booking).catch(() => {});

  res.status(HTTP_STATUS.OK).json({ success: true, data: { status: booking.status } });
}

/**
 * POST /api/bookings/:id/recording-uploaded
 * Frontend calls this once the recorded blob has been uploaded.
 */
async function notifyRecordingUploaded(req, res) {
  const booking = await LiveBooking.findById(req.params.id);
  if (!booking) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');
  if (String(booking.applicantId) !== req.user.id) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Only the applicant can upload the recording');
  }

  const { recordingUrl } = req.body;
  if (!recordingUrl) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'recordingUrl is required');

  booking.recordingUrl  = recordingUrl;
  if (booking.status === LIVE_BOOKING_STATUS.MEETING_COMPLETED ||
      booking.status === LIVE_BOOKING_STATUS.MEETING_STARTED) {
    booking.status = LIVE_BOOKING_STATUS.EVALUATING_AI;
  }
  booking.meetingEndedAt = booking.meetingEndedAt || new Date();
  await booking.save();

  liveAiService.queueLiveAnalysis(booking._id).catch(err =>
    logger.error(`AI pipeline kickoff failed for ${booking._id}: ${err.message}`)
  );

  res.status(202).json({ success: true, message: 'Recording received, AI analysis queued.' });
}

/**
 * POST /api/webhooks/ai-analysis-complete
 */
async function handleAiAnalysisWebhook(req, res) {
  const expected = process.env.AI_WEBHOOK_SECRET;
  const provided = req.headers['x-ai-webhook-secret'];
  if (expected && provided !== expected) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Bad secret' });
  }

  const body = req.body || {};
  const { booking_id: bookingId, status, report, reason } = body;

  logger.info(`[webhook/ai-complete] received bookingId=${bookingId} status=${status} bodyKeys=${Object.keys(body).join(',')}`);

  if (!bookingId) throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'booking_id is required');

  let booking;
  try {
    if (status === 'failed') {
      booking = await liveAiService.markAiFailed(bookingId, reason || 'AI gateway reported failure');
    } else {
      booking = await liveAiService.applyAiReport(bookingId, report || {});
    }
  } catch (err) {
    logger.error(`[webhook/ai-complete] applyAiReport THREW: ${err.message}`, { stack: err.stack });
    throw err;
  }

  if (booking && booking.status === LIVE_BOOKING_STATUS.RESULTS_READY) {
    emitBookingChanged(booking.applicantId);
    const applicant = await User.findById(booking.applicantId).catch(() => null);
    if (applicant?.email) {
      sendResultsReady({
        to: applicant.email,
        role: booking.role,
        dashboardUrl: `${PUBLIC_APP_URL}/live-interview/results/${booking._id}`,
        overallScore: report?.overall_score,
      }).catch(err => logger.error(`Results email failed: ${err.message}`));
    }
  }

  logger.info(`[webhook/ai-complete] OK bookingId=${bookingId} finalStatus=${booking?.status}`);
  res.status(HTTP_STATUS.OK).json({ success: true });
}

/**
 * POST /api/bookings/:id/feedback
 * Interviewer submits manual score + qualitative feedback + optional Q&A transcript.
 * If a transcript is provided the AI Gateway evaluates it synchronously (~3-10 s)
 * and the combined score (AI 50% + Human 50%) is stored alongside the aiReport.
 */
async function submitInterviewerFeedback(req, res) {
  const booking = await LiveBooking.findById(req.params.id);
  if (!booking) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');

  const intvId = await _interviewerIdFor(req.user.id);
  if (!intvId || String(booking.interviewerId) !== String(intvId)) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Only the assigned interviewer can submit feedback');
  }

  const { humanScore, humanFeedback, transcript, dimensionScores } = req.body;

  if (typeof humanScore !== 'number' || humanScore < 0 || humanScore > 100) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'humanScore must be a number 0–100');
  }
  // humanFeedback is optional now — scoring (the sliders) is the required part.
  // It's only used for free-form mistakes/tips, so just cap its length if given.
  const cleanFeedback = (typeof humanFeedback === 'string' && humanFeedback.trim().length > 0)
    ? humanFeedback.trim().slice(0, 4000)
    : null;

  // Per-dimension scores (face, voice, confidence, …) — all optional, each 0–100.
  const DIMENSION_KEYS = ['confidence', 'communication', 'technical', 'problemSolving', 'bodyLanguage', 'voiceClarity'];
  const cleanDimensions = {};
  if (dimensionScores && typeof dimensionScores === 'object') {
    for (const key of DIMENSION_KEYS) {
      const v = dimensionScores[key];
      if (v === undefined || v === null || v === '') continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, `${key} score must be a number 0–100`);
      }
      cleanDimensions[key] = Math.round(n);
    }
  }

  // ── Save human feedback fields ─────────────────────────────────────────────
  booking.humanScore       = humanScore;
  if (cleanFeedback) booking.humanFeedback = cleanFeedback;
  booking.humanSubmittedAt = new Date();
  if (Object.keys(cleanDimensions).length > 0) {
    booking.humanDimensionScores = cleanDimensions;
  }

  const cleanTranscript = transcript && transcript.trim().length >= 20
    ? transcript.trim()
    : null;

  if (cleanTranscript) {
    booking.interviewTranscript = cleanTranscript;
  }

  // ── AI Analysis (synchronous — ~3-10 s Groq call) ─────────────────────────
  // Runs regardless of whether the interviewer provided a transcript.
  try {
    const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const aiPayload = {
      role:              booking.role,
      domain:            booking.domain,
      skills:            booking.skills || [],
      interviewer_score: humanScore,
    };
    if (cleanTranscript) aiPayload.transcript = cleanTranscript;

    const aiRes = await fetch(`${AI_URL}/api/ai/evaluate-live-interview`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPayload),
      signal: AbortSignal.timeout(20000), // 20 s max — Groq is fast
    });

    if (aiRes.ok) {
      const aiData = await aiRes.json();
      if (aiData.status === 'success') {
        booking.aiReport      = aiData;
        booking.aiCompletedAt = new Date();

        // ── Combined score: AI 50% + Human 50% ────────────────────────────
        const aiOverall = Number(aiData.overall_score) || 0;
        booking.combinedScore = Math.round((aiOverall * 0.5) + (humanScore * 0.5));

        logger.info(
          `[feedback] AI analysis complete for ${booking._id}: ` +
          `ai=${aiOverall}, human=${humanScore}, combined=${booking.combinedScore}`
        );
      } else {
        logger.warn(`[feedback] AI returned non-success for ${booking._id}: ${aiData.message}`);
      }
    } else {
      const errText = await aiRes.text().catch(() => '');
      logger.warn(`[feedback] AI gateway responded ${aiRes.status} for ${booking._id}: ${errText}`);
    }
  } catch (aiErr) {
    // Non-blocking — human score is always saved even if AI fails
    logger.error(`[feedback] AI evaluation failed for ${booking._id}: ${aiErr.message}`);
  }

  // ── Always mark results ready once human feedback is submitted ────────────
  booking.status = LIVE_BOOKING_STATUS.RESULTS_READY;
  await booking.save();
  emitBookingChanged(booking.applicantId);

  // ── Notify applicant ──────────────────────────────────────────────────────
  const applicant = await User.findById(booking.applicantId);
  if (applicant?.email) {
    const displayScore = booking.combinedScore
      ?? booking.aiReport?.overall_score
      ?? humanScore;

    sendResultsReady({
      to:           applicant.email,
      role:         booking.role,
      dashboardUrl: `${PUBLIC_APP_URL}/live-interview/results/${booking._id}`,
      overallScore: displayScore,
    }).catch(err => logger.error(`Results email failed: ${err.message}`));
  }

  res.status(HTTP_STATUS.OK).json({ success: true, data: booking });
}


/**
 * POST /api/bookings/:id/no-show  (admin or scheduled job)
 */
async function markNoShow(req, res) {
  const booking = await LiveBooking.findById(req.params.id);
  if (!booking) throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Booking not found');

  if (booking.status === LIVE_BOOKING_STATUS.REFUNDED) {
    return res.status(HTTP_STATUS.OK).json({ success: true, data: booking });
  }

  booking.status             = LIVE_BOOKING_STATUS.FAILED_NO_SHOW;
  booking.cancelledAt        = new Date();
  booking.cancellationReason = 'interviewer_no_show';

  try {
    await paymentService.refundBooking(booking);
    booking.paymentStatus = 'refunded';
    booking.refundedAt    = new Date();
    booking.status        = LIVE_BOOKING_STATUS.REFUNDED;
  } catch (err) {
    logger.error(`Refund failed for ${booking._id}: ${err.message}`);
  }

  await booking.save();

  const applicant = await User.findById(booking.applicantId);
  if (applicant?.email) {
    sendNoShowRefund({ to: applicant.email, role: booking.role, scheduledTime: booking.scheduledTime })
      .catch(err => logger.error(`No-show email failed: ${err.message}`));
  }

  res.status(HTTP_STATUS.OK).json({ success: true, data: booking });
}

/**
 * POST /api/bookings/check-conflict
 * Check if the interviewer is available and doesn't have a conflict near this time slot.
 */
async function checkConflict(req, res) {
  const { interviewerId, role, skills, domain, scheduledTime } = req.body;

  if (!scheduledTime) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'scheduledTime is required');
  }

  const slot = new Date(scheduledTime);
  if (Number.isNaN(slot.getTime()) || slot.getTime() < Date.now() + 5 * 60 * 1000) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'scheduledTime must be at least 5 minutes in the future');
  }

  let finalInterviewerId = interviewerId;

  // Auto-match if interviewerId is not provided or is set to 'auto'
  if (!finalInterviewerId || finalInterviewerId === 'auto') {
    const bookingService = require('../services/bookingService');
    const skillsArray = Array.isArray(skills)
      ? skills
      : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : []);

    const matchedIntv = await bookingService.findMatchingInterviewer({
      role,
      skills: skillsArray,
      domain,
      scheduledTime: slot,
    });

    if (!matchedIntv) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        available: false,
        message: 'No interviewer is available for the requested role, domain, and time. Please pick a different slot.'
      });
    }
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      available: true
    });
  }

  // Verify specific interviewer exists
  const interviewer = await Interviewer.findById(finalInterviewerId);
  if (!interviewer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Interviewer not found');
  }
  // [VETTING QUARANTINED] verification availability check disabled for testing. Restore on request.
  // if (!interviewer.isVerified) {
  //   return res.status(HTTP_STATUS.OK).json({
  //     success: true,
  //     available: false,
  //     message: 'This interviewer has not completed verification vetting.'
  //   });
  // }
  if (!interviewer.isAcceptingBookings) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      available: false,
      message: 'This interviewer is not currently accepting bookings.'
    });
  }

  // Check for existing conflict in the same time window
  const conflictWindowStart = new Date(slot.getTime() - 60 * 60 * 1000);
  const conflictWindowEnd   = new Date(slot.getTime() + 60 * 60 * 1000);
  const conflict = await LiveBooking.findOne({
    interviewerId: finalInterviewerId,
    scheduledTime: { $gte: conflictWindowStart, $lt: conflictWindowEnd },
    status: { $in: [
      LIVE_BOOKING_STATUS.PENDING_APPROVAL,
      LIVE_BOOKING_STATUS.ACCEPTED,
      LIVE_BOOKING_STATUS.PAYMENT_PENDING,
      LIVE_BOOKING_STATUS.PAYMENT_COMPLETED,
      LIVE_BOOKING_STATUS.MEETING_SCHEDULED,
      LIVE_BOOKING_STATUS.MEETING_STARTED,
    ]},
  });

  if (conflict) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      available: false,
      message: 'This interviewer already has a booking near that time slot. Please choose a different time.'
    });
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    available: true
  });
}

module.exports = {
  requestBooking,
  respondToBooking,
  listMyBookings,
  getBooking,
  createCheckout,
  handleStripeWebhook,
  joinMeeting,
  endMeeting,
  notifyRecordingUploaded,
  handleAiAnalysisWebhook,
  submitInterviewerFeedback,
  markNoShow,
  checkConflict,
};
