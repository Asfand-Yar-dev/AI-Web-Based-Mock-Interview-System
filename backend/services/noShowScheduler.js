/**
 * No-Show Scheduler — Premium Live Interview Feature
 * ---------------------------------------------------
 * Checks every minute for bookings where:
 *   - status is 'confirmed'
 *   - scheduledTime + NO_SHOW_GRACE_MINUTES has passed
 *   - the interviewer never joined (interviewerJoinedAt is null)
 *
 * When found, triggers the same no-show + refund logic used by the
 * admin endpoint POST /api/bookings/:id/no-show.
 *
 * Architecture: Doc/premium_live_interview_architecture.md §5.2
 *
 * Uses setInterval instead of node-cron to avoid an extra dependency.
 * Run once at server start via attachNoShowScheduler(). Safe to call
 * multiple times — subsequent calls are no-ops.
 */

const logger = require('../config/logger');
const LiveBooking = require('../models/LiveBooking');
const User = require('../models/User');
const { LIVE_BOOKING_STATUS, LIVE_INTERVIEW } = require('../config/constants');
const paymentService = require('./paymentService');
const { sendNoShowRefund } = require('../config/email');

const CHECK_INTERVAL_MS = 60 * 1000; // check every 60 seconds
let _attached = false;

/**
 * Process a single booking that qualifies as a no-show.
 */
async function _handleNoShow(booking) {
  if (booking.status === LIVE_BOOKING_STATUS.REFUNDED) return;

  logger.warn(`[no-show-scheduler] Booking ${booking._id} — interviewer no-show detected`);

  booking.status           = LIVE_BOOKING_STATUS.FAILED_NO_SHOW;
  booking.cancelledAt      = new Date();
  booking.cancellationReason = 'interviewer_no_show_auto';

  try {
    await paymentService.refundBooking(booking);
    booking.paymentStatus = 'refunded';
    booking.refundedAt    = new Date();
    booking.status        = LIVE_BOOKING_STATUS.REFUNDED;
  } catch (err) {
    logger.error(`[no-show-scheduler] Refund failed for ${booking._id}: ${err.message}`);
  }

  await booking.save();

  const applicant = await User.findById(booking.applicantId);
  if (applicant?.email) {
    sendNoShowRefund({
      to: applicant.email,
      role: booking.role,
      scheduledTime: booking.scheduledTime,
    }).catch((err) =>
      logger.error(`[no-show-scheduler] No-show email failed: ${err.message}`)
    );
  }
}

/**
 * Run one check cycle — find overdue confirmed bookings with no interviewer join.
 */
async function _checkNoShows() {
  const gracePeriodMs = LIVE_INTERVIEW.NO_SHOW_GRACE_MINUTES * 60 * 1000;
  const cutoff = new Date(Date.now() - gracePeriodMs);

  try {
    const overdue = await LiveBooking.find({
      status: LIVE_BOOKING_STATUS.CONFIRMED,
      scheduledTime: { $lte: cutoff },
      interviewerJoinedAt: null,
    }).limit(20);

    for (const booking of overdue) {
      await _handleNoShow(booking);
    }

    if (overdue.length > 0) {
      logger.info(`[no-show-scheduler] Processed ${overdue.length} no-show booking(s)`);
    }
  } catch (err) {
    logger.error(`[no-show-scheduler] Check cycle failed: ${err.message}`);
  }
}

/**
 * Attach the scheduler to the running server.
 * Call once after the database is connected.
 */
function attachNoShowScheduler() {
  if (_attached) return;
  _attached = true;
  setInterval(_checkNoShows, CHECK_INTERVAL_MS);
  logger.info(`No-show scheduler started (grace period: ${LIVE_INTERVIEW.NO_SHOW_GRACE_MINUTES} min, checks every 60 s)`);
}

module.exports = { attachNoShowScheduler };
