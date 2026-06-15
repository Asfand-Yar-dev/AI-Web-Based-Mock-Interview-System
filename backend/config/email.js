/**
 * Email Utility
 * Sends emails via nodemailer. Falls back to console-log in dev if SMTP is not configured.
 */

const logger = require('./logger');

/**
 * Build a transporter — uses SMTP env vars when set, otherwise falls back
 * to console-logging so dev works without real credentials AND without
 * needing nodemailer installed (lazy-required).
 */
async function _getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  let nodemailer;
  try {
    // eslint-disable-next-line global-require
    nodemailer = require('nodemailer');
  } catch (_e) {
    logger.warn('SMTP_HOST is set but `nodemailer` is not installed — falling back to console-log emails. Run `npm install nodemailer`.');
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send an email.
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 */
async function sendEmail({ to, subject, html }) {
  const transporter = await _getTransporter();

  if (!transporter) {
    // Dev mode — just log the email content
    logger.info(`[DEV EMAIL] To: ${to} | Subject: ${subject}`);
    logger.info(`[DEV EMAIL] Content: ${html.replace(/<[^>]+>/g, ' ').trim().slice(0, 200)}`);
    return;
  }

  const from = process.env.SMTP_FROM || `"Intervexa" <noreply@intervexa.app>`;

  const info = await transporter.sendMail({ from, to, subject, html });
  logger.info(`Email sent to ${to}: ${info.messageId}`);
}

/**
 * Send email verification email.
 */
async function sendVerificationEmail(email, name, token) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const link = `${baseUrl}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: 'Verify your Intervexa account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2 style="color:#4f46e5">Welcome to Intervexa, ${name}!</h2>
        <p style="color:#374151">Please verify your email address to activate your account.</p>
        <a href="${link}"
           style="display:inline-block;margin:20px 0;padding:12px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Verify Email
        </a>
        <p style="color:#6b7280;font-size:13px">
          This link expires in 24 hours. If you did not create an account, you can ignore this email.
        </p>
        <p style="color:#9ca3af;font-size:12px">
          Or copy this URL: <a href="${link}" style="color:#4f46e5">${link}</a>
        </p>
      </div>
    `,
  });
}

/**
 * Send a password-reset OTP email.
 * @param {string} email
 * @param {string} name
 * @param {string} otp - 6-digit one-time code
 */
async function sendPasswordResetOtp(email, name, otp) {
  await sendEmail({
    to: email,
    subject: 'Your Intervexa password reset code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2 style="color:#4f46e5">Reset your password</h2>
        <p style="color:#374151">Hi ${name || 'there'}, use the code below to reset your Intervexa password.</p>
        <div style="margin:24px 0;padding:18px 0;text-align:center;background:#f3f4f6;border-radius:10px">
          <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:#111827">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:13px">
          This code expires in 10 minutes. If you didn't request a password reset, you can safely ignore this email — your password won't change.
        </p>
      </div>
    `,
  });
}

/**
 * Build a calendar (.ics) attachment for a Premium Live booking.
 * Uses the `ics` package when installed, otherwise returns null silently.
 */
function _buildIcsAttachment({ booking, meetingUrl, attendeeEmail, organizerEmail }) {
  let ics;
  try {
    ics = require('ics');
  } catch (_e) {
    return null;
  }
  const start = new Date(booking.scheduledTime);
  const event = {
    title: `Intervexa Live Mock Interview — ${booking.role}`,
    description: `Join your live mock interview here: ${meetingUrl}`,
    start: [
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate(),
      start.getUTCHours(),
      start.getUTCMinutes(),
    ],
    duration: { minutes: booking.durationMinutes || 45 },
    location: meetingUrl,
    url: meetingUrl,
    organizer: organizerEmail ? { email: organizerEmail } : undefined,
    attendees: attendeeEmail ? [{ email: attendeeEmail, rsvp: true, partstat: 'NEEDS-ACTION' }] : [],
  };
  const { error, value } = ics.createEvent(event);
  if (error) return null;
  return { filename: 'intervexa-live-interview.ics', content: value, contentType: 'text/calendar' };
}

/**
 * Booking confirmation email — sent to applicant + interviewer after payment.
 * Architecture §3 Step 2.
 */
async function sendBookingConfirmation({ to, role, scheduledTime, meetingUrl, durationMinutes, booking }) {
  const when = new Date(scheduledTime).toUTCString();
  const ics = booking ? _buildIcsAttachment({ booking, meetingUrl, attendeeEmail: to }) : null;
  const transporter = await _getTransporter();

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
      <h2 style="color:#4f46e5">Your live mock interview is confirmed</h2>
      <p style="color:#374151">Role: <strong>${role}</strong></p>
      <p style="color:#374151">When: <strong>${when}</strong> (${durationMinutes || 45} min)</p>
      <a href="${meetingUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Join meeting room</a>
      <p style="color:#6b7280;font-size:13px">A calendar invite is attached. After the call, your AI report will arrive in ~10 minutes.</p>
    </div>`;

  if (!transporter) {
    logger.info(`[DEV EMAIL] Booking confirm → ${to} | ${role} @ ${when} | ${meetingUrl}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Intervexa" <noreply@intervexa.app>`,
    to,
    subject: `Live mock interview confirmed — ${role}`,
    html,
    attachments: ics ? [ics] : [],
  });
}

/**
 * No-show refund email — sent when interviewer never joins the room (§5.2).
 */
async function sendNoShowRefund({ to, role, scheduledTime }) {
  await sendEmail({
    to,
    subject: `We're sorry — your interviewer didn't show up`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#dc2626">Apologies — interviewer no-show</h2>
        <p>Your <strong>${role}</strong> interview scheduled for ${new Date(scheduledTime).toUTCString()} did not happen because the assigned interviewer didn't join.</p>
        <p>We've issued a full refund and added priority status to your account. You can rebook any time at no extra cost.</p>
      </div>`,
  });
}

/**
 * Results-ready email — sent only after BOTH AI report AND human feedback are in.
 * Architecture §3 Step 5 + §4 Feedback Lock.
 */
async function sendResultsReady({ to, role, dashboardUrl, overallScore }) {
  await sendEmail({
    to,
    subject: `Your ${role} interview report is ready`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#10b981">Your interview results are in</h2>
        ${typeof overallScore === 'number' ? `<p>Overall score: <strong>${overallScore}/100</strong></p>` : ''}
        <a href="${dashboardUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#10b981;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View 360° report</a>
        <p style="color:#6b7280;font-size:13px">Includes facial expression, voice tone, and language analysis plus your interviewer's notes.</p>
      </div>`,
  });
}

/**
 * Booking accepted email — sent to the applicant when an interviewer accepts.
 * Prompts the user to proceed with payment.
 */
async function sendBookingAccepted({ to, role, interviewerName, bookingId, scheduledTime, checkoutUrl }) {
  const when = new Date(scheduledTime).toUTCString();
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const payUrl = checkoutUrl || `${baseUrl}/live-interview/checkout/${bookingId}`;

  await sendEmail({
    to,
    subject: `✅ Your interview booking has been accepted — ${role}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#4f46e5">Your interview booking has been accepted!</h2>
        <p style="color:#374151">
          <strong>${interviewerName || 'Your interviewer'}</strong> has accepted your booking
          for the <strong>${role}</strong> interview scheduled on <strong>${when}</strong>.
        </p>
        <p style="color:#374151;font-weight:600;font-size:16px;margin:20px 0">
          Please proceed with payment to confirm your session.
        </p>
        <a href="${payUrl}"
           style="display:inline-block;margin:12px 0;padding:14px 32px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
          Proceed to Payment →
        </a>
        <p style="color:#6b7280;font-size:13px;margin-top:20px">
          Your slot is held for 2 hours. After payment, you'll receive a calendar invite with the meeting link.
        </p>
      </div>`,
  });
}

/**
 * Booking rejected email — sent to the applicant when an interviewer declines.
 */
async function sendBookingRejected({ to, role, interviewerName, note, browseUrl }) {
  const base = browseUrl || 'http://localhost:3000/live-interview/book';
  await sendEmail({
    to,
    subject: `Interview booking update — ${role}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px">
        <h2 style="color:#dc2626">Booking request declined</h2>
        <p style="color:#374151">
          Unfortunately, <strong>${interviewerName || 'the interviewer'}</strong> was unable to accept
          your <strong>${role}</strong> interview request${note ? ` — <em>${note}</em>` : ''}.
        </p>
        <p style="color:#374151">You can browse other available interviewers and book again.</p>
        <a href="${base}"
           style="display:inline-block;margin:16px 0;padding:12px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Browse Interviewers
        </a>
      </div>`,
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetOtp,
  sendBookingConfirmation,
  sendBookingAccepted,
  sendBookingRejected,
  sendNoShowRefund,
  sendResultsReady,
};
