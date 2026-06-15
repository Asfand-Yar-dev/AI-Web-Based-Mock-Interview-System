# Changes — Premium Live Interview Implementation

This doc lists every file added, renamed, or modified for the
**Premium Live Interview Feature**, mapped against
[`Doc/premium_live_interview_architecture.md`](./premium_live_interview_architecture.md).

> **Branch state:** changes are uncommitted on the working tree.
> Nothing has been pushed. Run `git status` to see them grouped.

---

## 1. Backend — Models

| Path | Action | Why |
|------|--------|-----|
| `backend/models/AIInterviewerConfig.js` | **NEW** | Old `Interviewer.js` was for AI personas. Renamed in spirit by copying it here under a clearer name (`AIInterviewerConfig`), so the new human-interviewer model can take the `Interviewer` filename per spec §2.A. |
| `backend/models/Interviewer.js` | **REWRITTEN** | Now models a **human interviewer profile** linked 1:1 to a `User` (architecture §2.A) — `userId`, `domains`, `skills`, `roles`, `hourlyRate`, weekly `availability` slots, `rating`, `isAcceptingBookings`. Indexed on `(domains, skills, isAcceptingBookings)` for the auto-matching query. |
| `backend/models/LiveBooking.js` | **NEW** | Implements §2.B: applicant ↔ interviewer ↔ status, payment fields, `meetingRoomId` (auto-generated 128-bit hex), `recordingUrl`, `aiReport`, `humanScore`/`humanFeedback`, no-show / refund tracking. Method `canPublishResults()` enforces the §4 *Feedback Lock*. |
| `backend/models/InterviewerSelection.js` | MODIFIED | `ref: 'Interviewer'` → `ref: 'AIInterviewerConfig'` (was always pointing to the AI persona, never a human). |
| `backend/models/Schedule.js` | MODIFIED | Same ref-correction. |
| `backend/models/index.js` | MODIFIED | Exports both `AIInterviewerConfig` and the new human `Interviewer`, plus `LiveBooking`. |

## 2. Backend — Constants & Config

| Path | Action | Why |
|------|--------|-----|
| `backend/config/constants.js` | MODIFIED | Added `LIVE_BOOKING_STATUS` (the full lifecycle from §2.B) and `LIVE_INTERVIEW` (no-show grace = 10 min, AI timeout = 20 min, etc.). |
| `backend/config/email.js` | MODIFIED | Added `sendBookingConfirmation` (with `.ics` calendar attachment via the `ics` package), `sendNoShowRefund`, and `sendResultsReady`. The latter is only called once §4 Feedback Lock is satisfied. |
| `backend/.env.example` | MODIFIED | Added Stripe secrets, success/cancel URLs, `AI_WEBHOOK_SECRET`, `LIVE_RECORDING_BUCKET`, Socket.io path/CORS. |
| `backend/package.json` | MODIFIED | Added deps: `socket.io`, `stripe`, `ics`, `nodemailer` (the email helpers were already importing it but it wasn't declared). |

## 3. Backend — Services

| Path | Action | Why |
|------|--------|-----|
| `backend/services/bookingService.js` | **NEW** | Auto-matching service (§3 Step 1 + §4 weighting). Picks an interviewer ranked by rating, filters out anyone with a conflicting booking in a ±1h window, and respects each interviewer's weekly availability. |
| `backend/services/paymentService.js` | **NEW** | Stripe wrapper: `createCheckoutSession`, `verifyWebhookSignature`, `refundBooking`. Falls back to a stub mode when `STRIPE_SECRET_KEY` is missing so the rest of the feature can be tested locally without real keys. |
| `backend/services/liveAiService.js` | **NEW** | Posts the recorded session URL to the Python AI gateway, persists the returned `aiReport`, and advances `LiveBooking.status` once both AI + human pieces have arrived (§4 Feedback Lock). Retries are tracked via `aiAttempts`. |
| `backend/services/signalingService.js` | **NEW** | Attaches Socket.IO to the http.Server. Implements §3 Step 3 events: `join-room`, `offer`, `answer`, `ice-candidate`, `leave-room`. Authenticates each socket via JWT in the handshake, refuses joins from anyone who isn't the booking's applicant or assigned interviewer, and stamps `applicantJoinedAt` / `interviewerJoinedAt` (used by the §5.2 no-show timer). |

## 4. Backend — Controllers & Routes

| Path | Action | Why |
|------|--------|-----|
| `backend/controllers/liveBookingController.js` | **NEW** | Handlers for the entire live-booking lifecycle: request, list mine, detail, create checkout, Stripe webhook, recording-uploaded, AI webhook, interviewer feedback, no-show + refund. |
| `backend/routes/bookingRoutes.js` | **NEW** | `POST /api/bookings/request`, `GET /mine`, `GET /:id`, `POST /:id/recording-uploaded`, `POST /:id/feedback`, `POST /:id/no-show`, **plus** `POST /:id/upload-recording` (multipart, 500 MB cap) so the dev flow works without S3. |
| `backend/routes/paymentRoutes.js` | **NEW** | `POST /api/payments/create-checkout` — generates a Stripe Checkout Session for a `pending_payment` booking. |
| `backend/routes/webhookRoutes.js` | **NEW** | `POST /api/webhooks/stripe` (raw body, signature verified) and `POST /api/webhooks/ai-analysis-complete` (authenticated by `X-AI-Webhook-Secret`). Mounted **before** the global JSON parser in `server.js` so Stripe sigs validate. |
| `backend/routes/interviewerRoutes.js` | **NEW** | Profile CRUD + public discovery for human interviewers. Submitting a profile auto-promotes the user to `user_role: 'interviewer'`. |
| `backend/server.js` | MODIFIED | Mounts the four new route files, mounts `/api/webhooks/*` *before* the JSON parser, switches `app.listen` → `http.createServer(app)` and `attachSignaling(server)` so Socket.IO can attach. |

## 5. AI Gateway

| Path | Action | Why |
|------|--------|-----|
| `ai_gateway/app.py` | MODIFIED | Added `POST /api/ai/analyze-video` (queue) and `GET /api/ai/analyze-video/<job_id>` (poll). Background thread runs facial → vocal → fusion on the recorded video and POSTs the structured report to the backend webhook with `X-AI-Webhook-Secret`. Architecture §3 Step 4 + §5.1. |

## 6. Frontend

| Path | Action | Why |
|------|--------|-----|
| `lib/api-config.ts` | MODIFIED | Added `API_ENDPOINTS.LIVE.*` and `SOCKET_IO_PATH`. |
| `lib/liveInterviewApi.ts` | **NEW** | Typed fetch helpers for booking / payment / interviewer-profile endpoints. |
| `components/live-interview/LiveInterviewRoom.tsx` | **NEW** | WebRTC peer connection (STUN-only for now), Socket.IO signalling, MediaRecorder capture, end-of-call upload to backend. Architecture §3 Step 3 + §5.4. |
| `app/live-interview/book/page.tsx` | **NEW** | Booking form (role / domain / skills / time / duration). |
| `app/live-interview/checkout/[bookingId]/page.tsx` | **NEW** | Confirms booking summary, calls `/api/payments/create-checkout`, redirects to Stripe. |
| `app/live-interview/room/[roomId]/page.tsx` | **NEW** | Resolves the booking from `meetingRoomId`, renders `LiveInterviewRoom`. |
| `app/live-interview/results/[bookingId]/page.tsx` | **NEW** | Polls the booking until `status === 'results_ready'` (or no-show), renders the AI report + interviewer feedback. |
| `app/live-interview/booking/success/page.tsx` | **NEW** | Stripe success-redirect landing. |
| `app/live-interview/booking/cancel/page.tsx` | **NEW** | Stripe cancel-redirect landing. |
| `package.json` | MODIFIED | Added `socket.io-client` to frontend deps. |

---

## 7. Things you still need to do

These are deliberate gaps — the architecture doc calls them out, but they
require credentials or infra we shouldn't fabricate:

1. **`npm install`** in both `/` and `/backend` to pull `socket.io`,
   `socket.io-client`, `ics`, `nodemailer`. The recording uploader
   uses multer, which is already installed. (`stripe` is intentionally
   *not* in the dep list — see point 2.)
2. **Stripe credentials — currently DISABLED for the dev/sample run.**
   `services/paymentService.js` runs in stub mode: every call to
   `/api/payments/create-checkout` returns a fake redirect URL AND
   immediately flips the booking to `confirmed` + `paymentStatus=paid`,
   sending the calendar-invite emails as if a real payment had completed.
   The real Stripe SDK calls are present but commented out (search for
   `STRIPE-LIVE` blocks). To enable real payments later:
     1. `cd backend && npm install stripe`
     2. Uncomment the `STRIPE-LIVE` blocks in `services/paymentService.js`
     3. Re-enable the `STRIPE_*` env vars in `backend/.env.example`
     4. Remove the `if (session.stub) { … }` auto-confirm branch in
        `controllers/liveBookingController.js#createCheckout`
3. **`AI_WEBHOOK_SECRET`** — generate a 64-char hex string and put it in
   *both* `backend/.env` and `ai_gateway/.env`. The backend will refuse the
   AI webhook without it in production.
4. **S3 / cloud storage for recordings.** The current
   `POST /api/bookings/:id/upload-recording` writes to
   `backend/uploads/live-recordings/` and passes `file://...` to the AI
   gateway. Swap that handler for a presigned-URL flow once
   `LIVE_RECORDING_BUCKET` is provisioned.
5. **Scheduled no-show sweep.** `POST /api/bookings/:id/no-show` is wired
   up, but nothing calls it automatically yet. Add a cron / scheduled job
   that scans for bookings where `scheduledTime + 10min < now` and the
   interviewer never set `interviewerJoinedAt`. Architecture §5.2.
6. **TURN server.** `RTC_CONFIG` only includes a public Google STUN. You'll
   want a TURN server (coturn or a managed provider) for users behind
   symmetric NATs before this goes to real users.
7. **IndexedDB offline cache for recordings (§5.4)** — currently a TODO
   comment in `LiveInterviewRoom.tsx`. Implement when you're ready to harden
   the upload path.

---

## 8. Quick smoke-test plan

```bash
# 1. backend
cd backend
npm install
cp .env.example .env  # then fill in Mongo + JWT_SECRET
npm run dev

# 2. ai gateway
cd ../ai_gateway
python app.py

# 3. frontend
cd ..
npm install
npm run dev
```

Manual test path:

1. Sign up two users, A (applicant) and B (interviewer).
2. As B, `POST /api/interviewers` with a profile payload — check role
   auto-promotes to `interviewer`.
3. As A, open `/live-interview/book` and submit. Confirm a booking is
   created with status `pending_payment` and the matched
   `interviewerId === B`.
4. Click "Continue to payment" — redirects to Stripe (or the stub URL if
   no key). Hit the success page → booking flips to `confirmed`, both A
   and B receive a `[DEV EMAIL]` log line in the backend console.
5. Open `/live-interview/room/<meetingRoomId>` in two browsers (A and B).
   You should see both video tiles.
6. End the call from A — recording is POSTed, status → `evaluating_ai`,
   AI gateway runs, webhook fires, status → `results_ready` once B
   submits feedback via `POST /api/bookings/:id/feedback`.
7. Visit `/live-interview/results/<bookingId>` — final report renders.
