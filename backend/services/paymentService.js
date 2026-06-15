/**
 * Payment Service — Jazzcash / Easypaisa integration for Premium Live Interviews
 * -------------------------------------------------------------------------------
 * Architecture: Doc/premium_live_interview_architecture.md §3 Step 2 + §5.2
 *
 * ⚠️  STUB MODE (current state)
 * ──────────────────────────────
 * Jazzcash/Easypaisa do not have an official Node.js SDK.  The real integration
 * requires building a HMAC-SHA256 signed form POST to their payment page.  That
 * flow is commented in and clearly marked JAZZCASH-LIVE below.
 *
 * In stub mode the booking is auto-confirmed right after `createCheckoutSession`
 * returns so the rest of the pipeline (WebRTC, recording, AI analysis, results)
 * can be exercised without real payment credentials.
 *
 * To enable real Jazzcash later:
 *   1. Set JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT in .env
 *   2. Set JAZZCASH_RETURN_URL and JAZZCASH_SUCCESS_URL in .env
 *   3. Uncomment the JAZZCASH-LIVE blocks below
 *   4. Remove the stub block in createCheckoutSession
 *
 * Easypaisa works similarly — swap the endpoint URL and hash fields.
 */

const crypto = require('crypto');
const logger = require('../config/logger');

const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'http://localhost:3000';

// ── Jazzcash LIVE: hash builder ───────────────────────────────────────────────
// Uncomment when ready to take real payments.
//
// function _jazzcashHash(params, integritySalt) {
//   // Jazzcash requires all non-empty params to be sorted alphabetically
//   // and concatenated as "salt&key1=val1&key2=val2..." then HMAC-SHA256'd.
//   const sortedKeys = Object.keys(params).filter(k => params[k] !== '').sort();
//   const hashString = [integritySalt, ...sortedKeys.map(k => params[k])].join('&');
//   return crypto.createHmac('sha256', integritySalt).update(hashString).digest('hex').toUpperCase();
// }

/**
 * Build a Jazzcash/Easypaisa payment URL for a LiveBooking.
 * In stub mode this returns a fake URL pointing at the success page so the
 * flow can be exercised without credentials.
 *
 * Returns: { sessionId, url, amountCents, stub }
 */
async function createCheckoutSession({ booking, interviewer }) {
  const successUrl = `${PUBLIC_APP_URL}/live-interview/booking/success?bookingId=${booking._id}`;
  const cancelUrl  = `${PUBLIC_APP_URL}/live-interview/my-bookings`;

  // Pricing: hourly rate × duration (rounded to nearest cent, min PKR 500)
  const hours      = (booking.durationMinutes || 45) / 60;
  const amountPKR  = Math.max(500, Math.round((interviewer?.hourlyRate || 25) * hours * 100));

  // ── STUB MODE ─────────────────────────────────────────────────────────────
  if (!process.env.JAZZCASH_MERCHANT_ID || process.env.JAZZCASH_MERCHANT_ID === 'REPLACE_ME') {
    logger.info(`[stub-pay] Issuing fake Jazzcash checkout for booking ${booking._id} — amount PKR ${amountPKR / 100}`);
    return {
      sessionId:   `stub_jcash_${booking._id}`,
      url:         `${successUrl}&stub=1`,
      amountCents: amountPKR,
      currency:    'PKR',
      stub:        true,
    };
  }

  // ── JAZZCASH-LIVE: real signed form-post URL ───────────────────────────────
  // const merchantId     = process.env.JAZZCASH_MERCHANT_ID;
  // const password       = process.env.JAZZCASH_PASSWORD;
  // const integritySalt  = process.env.JAZZCASH_INTEGRITY_SALT;
  // const returnUrl      = process.env.JAZZCASH_RETURN_URL || successUrl;
  //
  // const txnDateTime    = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  // const txnRefNo       = `TXN${booking._id}${txnDateTime}`;
  // const txnExpiryDate  = new Date(Date.now() + 30 * 60 * 1000)
  //                          .toISOString().replace(/[-:T]/g, '').slice(0, 14);
  //
  // const params = {
  //   pp_Version:          '1.1',
  //   pp_TxnType:          'MWALLET',
  //   pp_Language:         'EN',
  //   pp_MerchantID:       merchantId,
  //   pp_Password:         password,
  //   pp_TxnRefNo:         txnRefNo,
  //   pp_Amount:           String(amountPKR),
  //   pp_TxnCurrency:      'PKR',
  //   pp_TxnDateTime:      txnDateTime,
  //   pp_BillReference:    String(booking._id),
  //   pp_Description:      `Live Mock Interview — ${booking.role}`,
  //   pp_TxnExpiryDateTime: txnExpiryDate,
  //   pp_ReturnURL:        returnUrl,
  //   pp_SecureHash:       '',
  // };
  // params.pp_SecureHash = _jazzcashHash(params, integritySalt);
  //
  // // Build query string for hosted-page redirect
  // const qs = new URLSearchParams(params).toString();
  // const jazzcashHostedPageUrl = `https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/?${qs}`;
  //
  // return { sessionId: txnRefNo, url: jazzcashHostedPageUrl, amountCents: amountPKR, currency: 'PKR', stub: false };
}

/**
 * Verify the Jazzcash webhook callback payload.
 * Jazzcash uses HMAC-SHA256 of sorted params with the IntegritySalt.
 * In stub mode we just parse the JSON body.
 */
function verifyWebhookSignature(rawBody) {
  // ── STUB MODE ─────────────────────────────────────────────────────────────
  if (Buffer.isBuffer(rawBody)) return JSON.parse(rawBody.toString('utf8'));
  return typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

  // ── JAZZCASH-LIVE ─────────────────────────────────────────────────────────
  // const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
  // if (!integritySalt) throw new Error('JAZZCASH_INTEGRITY_SALT not configured');
  // const params = typeof rawBody === 'string' ? Object.fromEntries(new URLSearchParams(rawBody)) : rawBody;
  // const receivedHash = params.pp_SecureHash;
  // const { pp_SecureHash, ...rest } = params;
  // const computedHash = _jazzcashHash(rest, integritySalt);
  // if (computedHash !== receivedHash) throw new Error('Invalid Jazzcash signature');
  // return params;
}

/**
 * Issue a refund for a no-show booking.
 * Jazzcash refunds are handled through their merchant portal / API.
 * In stub mode this is a no-op that pretends to succeed.
 */
async function refundBooking(booking) {
  // ── STUB MODE ─────────────────────────────────────────────────────────────
  logger.info(`[stub-pay] Pretend-refunded Jazzcash booking ${booking._id}`);
  return { id: `stub_refund_${booking._id}`, status: 'succeeded' };

  // ── JAZZCASH-LIVE ─────────────────────────────────────────────────────────
  // Jazzcash Reversal API:
  //   POST https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoRefund
  // Requires: pp_MerchantID, pp_Password, pp_TxnRefNo, pp_Amount, pp_SecureHash
  // Consult: https://sandbox.jazzcash.com.pk/JazzCashAPI/Content/Docs/JazzCash_API_S2S_Integration_Guide.pdf
}

module.exports = {
  createCheckoutSession,
  verifyWebhookSignature,
  refundBooking,
};
