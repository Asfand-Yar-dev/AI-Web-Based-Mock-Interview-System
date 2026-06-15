/**
 * Webhook Routes — third-party callbacks
 *
 *   POST /api/webhooks/jazzcash               Jazzcash/Easypaisa payment callback
 *   POST /api/webhooks/ai-analysis-complete   AI gateway → backend (10-min report)
 *
 * Source: Doc/premium_live_interview_architecture.md §3 Step 2 + §3 Step 4
 */

const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const ctrl = require('../controllers/liveBookingController');

const router = express.Router();

// Jazzcash/Easypaisa callback
// Note: Jazzcash sends a URL-encoded POST (or JSON depending on integration type).
// We accept raw body here so the signature verifier has access to the original bytes.
router.post(
  '/jazzcash',
  express.raw({ type: ['application/json', 'application/x-www-form-urlencoded'] }),
  asyncHandler(ctrl.handleStripeWebhook)  // reuses same controller — rename when going live
);

// AI gateway — JSON body parser is fine
router.post(
  '/ai-analysis-complete',
  express.json({ limit: '5mb' }),
  asyncHandler(ctrl.handleAiAnalysisWebhook)
);

module.exports = router;
