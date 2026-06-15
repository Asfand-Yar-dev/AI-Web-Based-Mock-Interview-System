# Intervexa — Security & Quality Improvements

All 11 tasks implemented across the backend (Express 5) and frontend (Next.js).  
Branch: `ai-fix`

---

## Task 1 — API Rate Limiting (`express-rate-limit`)

**Status:** Was partially done. Fixed and extended.

### What was done
- General limiter: **100 req / 15 min** per IP on all `/api/*` routes
- Stricter auth limiter: **10 attempts / 15 min** on login/register/OAuth/forgot-password/reset-password
- `skipSuccessfulRequests: true` on auth limiter — only failed attempts count toward the cap
- `standardHeaders: true` — clients receive `RateLimit-*` headers automatically
- Added Google OAuth endpoint (`/api/users/google`) to auth limiter

### Key files
- `backend/server.js` — limiter registration
- `backend/.env` — `RATE_LIMIT_MAX_REQUESTS=1000`, `AUTH_RATE_LIMIT_MAX_REQUESTS=10`

### Important points
- The default in code is `|| 100` (not 1000) — `.env` overrides it for development
- Auth limiter counts only **failed** attempts, so legitimate users are never blocked
- Behind a reverse proxy (nginx / AWS ELB), `app.set('trust proxy', 1)` is required for correct IP detection

---

## Task 2 — Input Validation (`express-validator`)

**Status:** Was partially done (login, register, addQuestion). Extended to cover all remaining routes.

### What was added
| Validator | Route |
|-----------|-------|
| `forgotPasswordValidation` | `POST /api/users/forgot-password` |
| `resetPasswordValidation` | `POST /api/users/reset-password` |
| `changePasswordValidation` | `PUT /api/users/change-password` |
| `updateProfileValidation` | `PUT /api/users/profile` |
| `refreshTokenValidation` | `POST /api/users/refresh` |
| `updateSettingsValidation` | `PUT /api/users/settings` |

### Key files
- `backend/middleware/validation.js` — all validator arrays
- `backend/routes/userRoutes.js` — validators spread into route handlers

### Important points
- Uses `express-validator` (not Joi/Zod) — already a project dependency
- `validationResult(req)` is checked in `errorHandler.js` and returns `422 Unprocessable Entity` with a list of field-level errors
- All string fields are `.trim()`'d and length-capped to prevent oversized payloads

---

## Task 3 — SQL / NoSQL Injection Prevention

**Status:** Not done. Implemented two layers.

### Layer 1 — `express-mongo-sanitize`
Strips `$` and `.` from `req.body` and `req.params` to prevent operator injection (e.g. `{ "$where": "..." }`).

**Express 5 fix:** `req.query` is read-only in Express 5, so a custom in-place sanitizer loop was written instead of passing `req.query` to the library.

### Layer 2 — ReDoS prevention in `$regex` queries
User input passed to MongoDB `$regex` is run through `escapeRegex()` first:
```js
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

### Key files
- `backend/server.js` — sanitizer middleware
- `backend/routes/questionRoutes.js` — `escapeRegex` applied to `category` and `search` query params

### Important points
- MongoDB is immune to SQL injection by design, but `$where` / `$gt` operator injection is a real threat
- Regex injection can cause catastrophic backtracking (ReDoS) — escaping is mandatory before any `$regex` query
- Pagination inputs are capped: `limit = Math.min(..., 100)`, `page = Math.max(..., 1)` to prevent oversized DB scans

---

## Task 4 — XSS Protection (`helmet.js`)

**Status:** Was partially done (basic helmet). Made explicit and extended to the frontend.

### Backend — `helmet.js` explicit config
```
contentSecurityPolicy: { defaultSrc: ["'none'"] }   ← deny-all (API, no HTML served)
xContentTypeOptions: true                            ← prevent MIME sniffing
xFrameOptions: { action: 'deny' }                   ← no framing
strictTransportSecurity: (production only)          ← HSTS 1 year
referrerPolicy: strict-origin-when-cross-origin
hidePoweredBy: true                                  ← removes X-Powered-By: Express
```

### Frontend — `next.config.mjs` security headers
Added `async headers()` block applying to all routes (`source: '/(.*)'`):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`
- `X-XSS-Protection: 1; mode=block`
- Full `Content-Security-Policy` allowing `self` + Google OAuth + inline styles (needed by Next.js)

### Key files
- `backend/server.js`
- `next.config.mjs`

### Important points
- HSTS is disabled in development (no HTTPS locally) — enabled only when `NODE_ENV=production`
- Frontend CSP must allow `https://accounts.google.com` for Google OAuth to work
- `lib/api.ts` changed `credentials: 'include'` → `'same-origin'` to avoid sending cookies cross-origin

---

## Task 5 — CSRF Protection

**Status:** Not needed. Documented why.

### Decision
The app uses **JWT Bearer token authentication** (`Authorization: Bearer <token>` header). Browsers never automatically attach custom headers to cross-origin requests (blocked by CORS), so CSRF attacks are impossible by design.

CSRF protection (e.g. `csurf`, double-submit cookies) is only required when auth state is carried in cookies.

### Important points
- If the app ever switches to cookie-based sessions, add `csurf` or the `SameSite=Strict` cookie attribute
- Current `credentials: 'same-origin'` in `lib/api.ts` ensures cookies (if any) are never sent cross-origin

---

## Task 6 — API Documentation (Swagger / OpenAPI)

**Status:** Not done. Fully implemented.

### What was done
- OpenAPI 3.0 spec defined inline in `backend/config/swagger.js`
- Covers all 30+ routes: Auth, Users, Interviews, Questions, Answers, Results, Admin, Health/Metrics
- Component schemas: `User`, `InterviewSession`, `Answer`, `AuthResponse`, `Error`, `ValidationError`
- Bearer token security scheme defined globally

### Endpoints
| URL | Description |
|-----|-------------|
| `/api-docs` | Swagger UI (interactive browser) |
| `/api-docs.json` | Raw OpenAPI JSON spec |

### Key files
- `backend/config/swagger.js` — full spec
- `backend/server.js` — `swaggerUi.serve` + `swaggerUi.setup` registered

### Important points
- Uses `swagger-jsdoc` + `swagger-ui-express`
- Spec is inline (`apis: []`) — no JSDoc scanning, so routes and spec stay in sync manually
- Available in all environments (development and production)

---

## Task 7 — Performance Monitoring

**Status:** Not done. Implemented two layers (no paid service required).

### Layer 1 — `express-status-monitor` (real-time dashboard)
- Live charts for CPU, memory, response time, RPS, status codes
- Available at `/status` (no auth required — internal use only)
- Must be registered **before** body parsers

### Layer 2 — Custom in-memory metrics middleware
Tracks per-request: latency, status codes, active requests, per-route stats.

**`GET /api/health/metrics`** (admin-only) returns:
```json
{
  "totalRequests": 1042,
  "errorRate": "2.3%",
  "latency": { "p50": 12, "p95": 145, "p99": 380 },
  "slowestRoutes": [...],
  "process": { "uptime": 3600, "memoryMB": 85, "cpu": {...} }
}
```

### Key files
- `backend/middleware/metricsMiddleware.js` — metrics store + `getMetrics()`
- `backend/server.js` — `app.use('/api', metricsMiddleware)` + `/api/health/metrics` endpoint

### Important points
- All data is in-memory — resets on server restart (by design, no external dependency)
- Rolling window of last 1000 requests for percentile calculations
- p50/p95/p99 calculated via sorted array (simple, accurate for ≤1000 samples)

---

## Task 8 — Error Tracking (Sentry)

**Status:** Not done. Fully implemented (opt-in via env var).

### What was done
- `@sentry/node` v10 initialized at the very top of `server.js` (before all other requires)
- `Sentry.setupExpressErrorHandler(app)` registered before the custom error handler
- Only 5xx non-operational errors are captured (4xx user errors are ignored)
- User context (`id`, `email`, `role`) attached to every event
- Request context (`route`, `method`, `body`) captured for debugging

### Activation
Set `SENTRY_DSN` in `.env` — the app works identically without it (all Sentry code is gated on `if (process.env.SENTRY_DSN)`).

### Key files
- `backend/server.js` — `Sentry.init()` at top
- `backend/middleware/errorHandler.js` — `Sentry.captureException()` for 5xx errors
- `backend/.env.example` — `SENTRY_DSN` commented example

### Important points
- `tracesSampleRate: 0.1` in production (10% of transactions) — prevents billing surprises
- `sendDefaultPii: true` — attaches user info to events (disable if PII is a concern)
- Must be the **first** require in `server.js` — Sentry instruments other modules at require time

---

## Task 9 — Comprehensive Logging

**Status:** Was basic (console only). Fully upgraded.

### What was added
- `winston-daily-rotate-file` — rotating log files with automatic cleanup
- Morgan HTTP request logging streamed into Winston (not a separate logger)
- Request correlation IDs (`X-Request-Id` header) — every log line for a request shares the same UUID

### Log files (in `backend/logs/`)
| File | Retention | Level |
|------|-----------|-------|
| `combined-YYYY-MM-DD.log` | 14 days | All levels |
| `error-YYYY-MM-DD.log` | 30 days | Error only |

### Log format (console)
```
10:32:45 [info] User logged in { userId: "abc123", email: "..." }
```

### Morgan format
```
<reqId> POST /api/users/login 200 148B 32ms user=abc123
```

### Key files
- `backend/config/logger.js` — Winston config, `morganStream`, `dailyRotate` transports
- `backend/server.js` — Morgan + correlation ID middleware
- `.gitignore` — `backend/logs/` excluded from git

### Important points
- `LOG_LEVEL=debug` in development, `LOG_LEVEL=info` in production (via `.env`)
- `backend/logs/` is git-ignored — never commit log files
- `logger.morganStream` pipes Morgan output through `logger.http()` level so HTTP logs appear in `combined-*.log`

---

## Task 10 — Database Indexing

**Status:** Was missing most indexes. Added compound indexes to all key models.

### Indexes added

**`User` model**
```js
{ lastLogin: -1 }              // "recently active users" queries
{ createdAt: -1 }              // "newest users" admin list
{ user_role: 1 }               // role-based filters
{ isActive: 1 }                // active user filters
```

**`InterviewSession` model** (existing + new)
```js
{ user_id: 1, status: 1, createdAt: -1 }   // user's sessions by status (compound)
{ user_id: 1, createdAt: -1 }              // user's session history
{ status: 1, overall_score: 1 }            // admin scoring queries
{ status: 1, started_at: -1 }             // stale session detection
{ status: 1, ended_at: -1 }               // recent completions
```

**`AnswerAnalysis` model**
```js
{ interviewId: 1 }                // load all analyses for a session
{ userId: 1, createdAt: -1 }      // user analysis history
```

### Key files
- `backend/models/User.js`
- `backend/models/InterviewSession.js`
- `backend/models/AnswerAnalysis.js`

### Important points
- Compound index field order matters — `{ user_id, status, createdAt }` supports queries on `user_id` alone, `user_id + status`, or all three; but NOT `status` alone
- `answerId` in `AnswerAnalysis` has `unique: true` in the schema field definition — no separate `index()` call needed
- Mongoose creates indexes on startup — on large collections, use `{ background: true }` (Mongoose 5) or run `createIndexes()` manually in a migration

---

## Task 11 — Caching Strategy (Redis)

**Status:** Not done. Fully implemented with graceful fallback.

### Architecture
```
Request → cache middleware → Redis HIT? → return cached JSON (skip DB)
                          → Redis MISS? → run handler → cache response → return
Redis unavailable?        → transparent no-op, handler always runs
```

### Cache applied to

| Route | TTL | Notes |
|-------|-----|-------|
| `GET /api/questions` | 5 min | Key includes querystring (filters/pagination) |
| `GET /api/questions/categories` | 15 min | Rarely changes |
| `GET /api/questions/random` | 1 min | Per-user scoped — different users get different results |
| `GET /api/admin/dashboard` | 1 min | Heavy aggregation; short TTL keeps it fresh |

### Cache invalidation
All three question mutation routes (`POST /add`, `PUT /:id`, `DELETE /:id`) call:
```js
redis.delPattern('route:/*')
```
This wipes all cached question responses atomically (uses Redis `SCAN` to avoid blocking).

### Cache key format
```
route:<path>[:<userId>][?<querystring>]

Examples:
  route:/                           ← GET /api/questions (no filters)
  route:/?category=React&page=2     ← GET /api/questions?category=React&page=2
  route:/categories                 ← GET /api/questions/categories
  route:/random:uabc123             ← GET /api/questions/random (user abc123)
  route:/dashboard                  ← GET /api/admin/dashboard
```

### Response headers
```
X-Cache: HIT   ← served from Redis
X-Cache: MISS  ← served from DB, now cached
```

### TTL constants (`backend/config/redis.js`)
```js
TTL.SHORT  = 60        //  1 minute
TTL.MEDIUM = 300       //  5 minutes
TTL.LONG   = 900       // 15 minutes
TTL.USER   = 120       //  2 minutes
```

### Health check
`GET /health` now reports:
```json
{ "redis": "connected" }   // or "unavailable"
```

### Key files
- `backend/config/redis.js` — `ioredis` client + TTL constants + graceful fallback
- `backend/middleware/cache.js` — route-level cache middleware
- `backend/routes/questionRoutes.js` — cache applied + invalidation on mutations
- `backend/routes/adminRoutes.js` — cache applied to dashboard
- `backend/server.js` — `/health` Redis status

### Activation
Uncomment `REDIS_URL=redis://localhost:6379` in `backend/.env`.  
Without `REDIS_URL`, all caching is silently skipped — the app works identically.

### Important points
- `ioredis` with `maxRetriesPerRequest: 2` and `lazyConnect: true` — fails fast, never hangs the app
- Only `2xx` responses are cached (errors are never stored)
- Only `GET` requests are cached (the middleware checks `req.method`)
- `SCAN`-based pattern deletion (`delPattern`) avoids blocking Redis with `KEYS *`

---

## Summary Table

| # | Task | Package(s) | Status |
|---|------|-----------|--------|
| 1 | API Rate Limiting | `express-rate-limit` | Done |
| 2 | Input Validation | `express-validator` | Done |
| 3 | Injection Prevention | `express-mongo-sanitize` + custom | Done |
| 4 | XSS Protection | `helmet` + Next.js headers | Done |
| 5 | CSRF Protection | — (not needed, Bearer auth) | N/A |
| 6 | API Documentation | `swagger-jsdoc` + `swagger-ui-express` | Done |
| 7 | Performance Monitoring | `express-status-monitor` + custom middleware | Done |
| 8 | Error Tracking | `@sentry/node` v10 | Done |
| 9 | Comprehensive Logging | `winston` + `winston-daily-rotate-file` + `morgan` | Done |
| 10 | Database Indexing | Mongoose `.index()` | Done |
| 11 | Caching Strategy | `ioredis` + custom cache middleware | Done |
