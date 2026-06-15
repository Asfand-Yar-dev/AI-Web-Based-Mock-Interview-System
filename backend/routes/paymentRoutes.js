/**
 * Payment Routes — Stripe checkout for Premium Live bookings
 *
 *   POST /api/payments/create-checkout    Generate a Stripe Checkout Session
 *
 * Source: Doc/premium_live_interview_architecture.md §3 Step 2
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ctrl = require('../controllers/liveBookingController');

const router = express.Router();

router.post('/create-checkout', authenticate, asyncHandler(ctrl.createCheckout));

module.exports = router;
