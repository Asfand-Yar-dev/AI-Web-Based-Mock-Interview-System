/**
 * Booking Routes — Premium Live Interview Feature
 *
 *   POST   /api/bookings/request          User sends manual booking request to selected interviewer
 *   GET    /api/bookings/mine             List my bookings (as applicant or interviewer)
 *   GET    /api/bookings/:id              Booking details
 *   POST   /api/bookings/:id/respond      Interviewer accepts or rejects booking request
 *   POST   /api/bookings/:id/join         Mark participant as joined (transitions to meeting_started)
 *   POST   /api/bookings/:id/end          End meeting (transitions to meeting_completed)
 *   POST   /api/bookings/:id/recording-uploaded  Notify backend the recording is in storage
 *   POST   /api/bookings/:id/feedback     Interviewer submits manual score/feedback
 *   POST   /api/bookings/:id/no-show      Mark interviewer no-show + refund (admin/cron)
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler }            = require('../middleware/errorHandler');
const { HTTP_STATUS }             = require('../config/constants');
const ctrl                        = require('../controllers/liveBookingController');
const liveAiService               = require('../services/liveAiService');
const LiveBooking                 = require('../models/LiveBooking');
const logger                      = require('../config/logger');

const router = express.Router();

// ── Core booking lifecycle ─────────────────────────────────────────────────────

// User sends a booking request to a specific interviewer (no auto-match)
// Note: requirePro removed — open to all authenticated users (pay-per-session model)
router.post('/request',                        authenticate, asyncHandler(ctrl.requestBooking));
router.post('/check-conflict',                 authenticate, asyncHandler(ctrl.checkConflict));

// Interviewer responds (accept / reject)
router.post('/:id/respond',                    authenticate, asyncHandler(ctrl.respondToBooking));

// List my bookings
router.get('/mine',                            authenticate, asyncHandler(ctrl.listMyBookings));

// Booking detail
router.get('/:id',                             authenticate, asyncHandler(ctrl.getBooking));

// ── Meeting session ────────────────────────────────────────────────────────────

// Mark participant as joined → triggers meeting_started when both are in
router.post('/:id/join',                       authenticate, asyncHandler(ctrl.joinMeeting));

// End the meeting session
router.post('/:id/end',                        authenticate, asyncHandler(ctrl.endMeeting));

// ── Post-session ───────────────────────────────────────────────────────────────

router.post('/:id/recording-uploaded',         authenticate, asyncHandler(ctrl.notifyRecordingUploaded));
router.post('/:id/feedback',                   authenticate, asyncHandler(ctrl.submitInterviewerFeedback));
router.post('/:id/no-show',                    authenticate, authorize('admin'), asyncHandler(ctrl.markNoShow));


// ── Recording upload (dev / FYP path without S3) ──────────────────────────────
const recordingsDir = path.resolve(__dirname, '..', 'uploads', 'live-recordings');
if (!fs.existsSync(recordingsDir)) fs.mkdirSync(recordingsDir, { recursive: true });

const recordingUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, recordingsDir),
    filename: (req, file, cb) => {
      const id = crypto.randomBytes(8).toString('hex');
      cb(null, `${req.params.id}-${id}.webm`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB cap
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio/video uploads accepted'), false);
  },
});

router.post(
  '/:id/upload-recording',
  authenticate,
  recordingUpload.single('recording'),
  asyncHandler(async (req, res) => {
    const booking = await LiveBooking.findById(req.params.id);
    if (!booking) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Booking not found' });
    if (String(booking.applicantId) !== req.user.id) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: 'Only the applicant can upload the recording' });
    }
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'No recording uploaded' });
    }

    const recordingUrl = `file://${req.file.path.replace(/\\/g, '/')}`;
    booking.recordingUrl = recordingUrl;
    await booking.save();

    liveAiService.queueLiveAnalysis(booking._id).catch(err =>
      logger.error(`AI pipeline kickoff failed for ${booking._id}: ${err.message}`)
    );

    res.status(HTTP_STATUS.OK).json({ success: true, recordingUrl });
  })
);

module.exports = router;
