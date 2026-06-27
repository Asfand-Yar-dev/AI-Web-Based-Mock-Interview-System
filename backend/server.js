/**
 * AI Interview System - Backend Server
 * Main entry point for the Express application
 */

require('dotenv').config();

const http = require('http');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const { connectDB, closeDB } = require('./config/db');
const logger = require('./config/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { HTTP_STATUS } = require('./config/constants');

// Initialize Express app
const app = express();

// PRODUCTION: Trust first proxy (nginx, AWS ELB, etc.)
// Required for correct req.ip and rate limiting behind reverse proxy
app.set('trust proxy', 1);

// ============ SECURITY MIDDLEWARE ============

// Helmet - Security headers
app.use(helmet());

// CORS Configuration
const corsOptions = {
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
};
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased to 1000 to allow background polling of scores
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// ============ BODY PARSING MIDDLEWARE ============

// Increased limit to 500 MB to support live recording uploads
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// SECURITY: Prevent NoSQL injection attacks
// NOTE: express-mongo-sanitize v2 tries to set req.query which is read-only
// in Express 5. We use a custom wrapper that sanitizes in-place instead.
app.use((req, res, next) => {
  // Sanitize body and params (writable in Express 5)
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);

  // Sanitize query values in-place (req.query is read-only in Express 5)
  const query = req.query;
  if (query && typeof query === 'object') {
    for (const key of Object.keys(query)) {
      if (typeof query[key] === 'string') {
        query[key] = query[key].replace(/[\$\.]/g, '');
      }
    }
  }

  next();
});

// PERFORMANCE: Gzip compress responses
app.use(compression());

// SECURITY: Stricter rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 10, // 10 attempts per 15 min
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/users/forgot-password', authLimiter);
app.use('/api/users/reset-password', authLimiter);

// ============ REQUEST LOGGING ============

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
});

// ============ HEALTH CHECK ROUTES ============

/**
 * @route   GET /
 * @desc    Basic server status
 */
app.get('/', (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'AI Interview System Backend Running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @route   GET /health
 * @desc    Health check endpoint for load balancers and monitoring
 * 
 * PHASE 6: Enhanced with DB status, memory usage, and service checks
 */
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState; // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting

  res.status(HTTP_STATUS.OK).json({
    success: true,
    status: dbState === 1 ? 'healthy' : 'degraded',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbState === 1 ? 'connected' : 'disconnected',
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    },
    // PHASE 6: Add Redis and AI service status checks
    // redis: app.get('redis')?.status === 'ready' ? 'connected' : 'disconnected',
    // aiService: process.env.USE_REAL_AI === 'true' ? 'enabled' : 'placeholder',
  });
});

// ============ API ROUTES ============

app.use('/api/users',      require('./routes/userRoutes'));
app.use('/api/interviews', require('./routes/interviewRoutes'));
app.use('/api/questions',  require('./routes/questionRoutes'));
app.use('/api/answers',    require('./routes/answerRoutes'));
app.use('/api/results',    require('./routes/resultRoutes'));
app.use('/api/admin',      require('./routes/adminRoutes'));

// ── Premium Live Interview Routes ────────────────────────────────────────────
// Architecture: Doc/premium_live_interview_architecture.md
app.use('/api/bookings',     require('./routes/bookingRoutes'));
app.use('/api/interviewers', require('./routes/interviewerRoutes'));
app.use('/api/payments',     require('./routes/paymentRoutes'));
app.use('/api/webhooks',     require('./routes/webhookRoutes'));
app.use('/api/vetting',      require('./routes/vettingRoutes'));

// =====================================================================
// API DOCUMENTATION (Swagger / OpenAPI)
// =====================================================================
// Interactive API explorer. Use it to test every endpoint:
//   • Swagger UI : GET /api-docs
//   • Raw spec   : GET /api-docs.json
//
// Auth: hit POST /api/users/login (or /register), copy the `token` from the
// response, click "Authorize" in the UI, paste it, and protected routes
// (those marked with a padlock) become testable.
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'Intervexa API Docs',
    swaggerOptions: { persistAuthorization: true },
  })
);

logger.info('Swagger UI available at /api-docs');
// =====================================================================

// =====================================================================
// PHASE 6: ERROR TRACKING (Sentry)
// =====================================================================
// Install: npm install @sentry/node
//
// const Sentry = require('@sentry/node');
// if (process.env.SENTRY_DSN) {
//   Sentry.init({
//     dsn: process.env.SENTRY_DSN,
//     environment: process.env.NODE_ENV || 'development',
//     tracesSampleRate: 0.1,
//   });
//   app.use(Sentry.Handlers.requestHandler());
//   // IMPORTANT: Sentry error handler must be BEFORE your custom error handler
//   // Move this BEFORE errorHandler: app.use(Sentry.Handlers.errorHandler());
// }
// =====================================================================

// =====================================================================
// PHASE 6: REDIS CACHING
// =====================================================================
// Install: npm install ioredis
//
// const Redis = require('ioredis');
// const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
// redis.on('connect', () => logger.info('Redis connected'));
// redis.on('error', (err) => logger.error('Redis error:', err.message));
// app.set('redis', redis); // Access via req.app.get('redis') in routes
// =====================================================================

// =====================================================================
// PHASE 6: CSRF PROTECTION (for cookie-based auth flows)
// =====================================================================
// Install: npm install csrf-csrf
// Only needed if you switch from Bearer token to cookie-based auth
//
// const { doubleCsrf } = require('csrf-csrf');
// const { doubleCsrfProtection } = doubleCsrf({
//   getSecret: () => process.env.CSRF_SECRET,
//   cookieName: '__csrf',
// });
// app.use(doubleCsrfProtection);
// =====================================================================

// ============ ERROR HANDLING ============

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(errorHandler);

// ============ SERVER STARTUP ============

const PORT = process.env.PORT || 5000;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();

    if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).includes('CHANGE_ME')) {
      logger.warn(
        'JWT_SECRET is missing or still set to a placeholder. Set a strong secret in .env or authentication will be insecure / unstable.'
      );
    }

    // ── Create HTTP server so Socket.IO can share the same port ────────────
    const httpServer = http.createServer(app);

    // ── Attach WebRTC signaling (Socket.IO) ──────────────────────────────────
    // Lazy — signalingService will log a warning if socket.io is not installed
    try {
      const { attachSignaling } = require('./services/signalingService');
      attachSignaling(httpServer);
    } catch (sigErr) {
      logger.warn(`WebRTC signaling could not be attached: ${sigErr.message}`);
    }

    // Start listening
    const server = httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);

      // ── Attach no-show auto-refund scheduler ────────────────────────────
      try {
        const { attachNoShowScheduler } = require('./services/noShowScheduler');
        attachNoShowScheduler();
      } catch (schedErr) {
        logger.warn(`No-show scheduler could not start: ${schedErr.message}`);
      }
    });

    // ============ GRACEFUL SHUTDOWN ============

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      httpServer.close(async () => {
        logger.info('HTTP server closed.');

        // Close database connection
        await closeDB();

        logger.info('Graceful shutdown completed.');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout.');
        process.exit(1);
      }, 30000).unref(); // .unref() prevents this timer from keeping the process alive
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app; // Export for testing