/**
 * WebRTC Signaling Service — Premium Live Interview Feature
 * --------------------------------------------------------
 * Attaches a Socket.IO server to an existing http.Server and brokers SDP
 * offers/answers + ICE candidates between the two peers (applicant ↔
 * interviewer) of a LiveBooking room.
 *
 * Source: Doc/premium_live_interview_architecture.md §3 Step 3.
 *
 * Events expected from clients:
 *   join-room     { roomId }
 *   offer         { roomId, sdp }
 *   answer        { roomId, sdp }
 *   ice-candidate { roomId, candidate }
 *   leave-room    { roomId }
 *
 * Authentication: clients pass their JWT in `auth.token` on the socket
 * handshake. Only the booking's applicant or assigned interviewer may
 * join the room. Anyone else is disconnected immediately.
 */

const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const LiveBooking = require('../models/LiveBooking');
const Interviewer = require('../models/Interviewer');
const { LIVE_BOOKING_STATUS } = require('../config/constants');

let _io = null;

/**
 * Attach Socket.IO to the given http.Server. Returns the io instance.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
function attachSignaling(httpServer) {
  if (_io) return _io;

  let Server;
  try {
    // Lazy require so the project can run before `npm install socket.io`
    Server = require('socket.io').Server;
  } catch (_e) {
    logger.warn('socket.io not installed — Premium Live signaling disabled. Run `npm install socket.io` in /backend.');
    return null;
  }

  _io = new Server(httpServer, {
    path: process.env.SOCKET_IO_PATH || '/socket.io',
    cors: {
      origin: (process.env.SOCKET_IO_CORS_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
      credentials: true,
    },
  });

  // ── JWT auth on handshake ────────────────────────────────────────────
  _io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No auth token'));
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  _io.on('connection', (socket) => {
    logger.info(`Signaling connect uid=${socket.user.id} sid=${socket.id}`);

    socket.on('join-room', async ({ roomId }, ack) => {
      try {
        const booking = await LiveBooking.findOne({ meetingRoomId: roomId });
        if (!booking) return ack && ack({ ok: false, error: 'Room not found' });

        const intvProfile = await Interviewer.findOne({ userId: socket.user.id });
        const isApplicant   = String(booking.applicantId)   === socket.user.id;
        const isInterviewer = intvProfile && String(booking.interviewerId) === String(intvProfile._id);

        if (!isApplicant && !isInterviewer) {
          return ack && ack({ ok: false, error: 'Not a participant of this booking' });
        }

        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.role   = isApplicant ? 'applicant' : 'interviewer';

        // Mark first-join times for the no-show timer (§5.2)
        const now = new Date();
        if (isApplicant   && !booking.applicantJoinedAt)   { booking.applicantJoinedAt   = now; }
        if (isInterviewer && !booking.interviewerJoinedAt) { booking.interviewerJoinedAt = now; }
        if (booking.applicantJoinedAt && booking.interviewerJoinedAt && !booking.meetingStartedAt) {
          booking.meetingStartedAt = now;
          booking.status = LIVE_BOOKING_STATUS.IN_PROGRESS;
        }
        await booking.save();

        // Notify the other peer that someone joined
        socket.to(roomId).emit('peer-joined', { role: socket.data.role });
        ack && ack({ ok: true, role: socket.data.role });
      } catch (err) {
        logger.error(`join-room failed: ${err.message}`);
        ack && ack({ ok: false, error: 'Server error' });
      }
    });

    socket.on('offer',         ({ roomId, sdp }) => socket.to(roomId).emit('offer',         { sdp, from: socket.data.role }));
    socket.on('answer',        ({ roomId, sdp }) => socket.to(roomId).emit('answer',        { sdp, from: socket.data.role }));
    socket.on('ice-candidate', ({ roomId, candidate }) => socket.to(roomId).emit('ice-candidate', { candidate, from: socket.data.role }));

    socket.on('leave-room', ({ roomId }) => {
      socket.to(roomId).emit('peer-left', { role: socket.data.role });
      socket.leave(roomId);
    });

    socket.on('disconnect', () => {
      const roomId = socket.data?.roomId;
      if (roomId) socket.to(roomId).emit('peer-left', { role: socket.data.role });
    });
  });

  logger.info('WebRTC signaling attached at ' + (process.env.SOCKET_IO_PATH || '/socket.io'));
  return _io;
}

module.exports = { attachSignaling, getIo: () => _io };
