/**
 * Route-level cache middleware.
 *
 * Usage:
 *   router.get('/categories', cache(TTL.LONG), asyncHandler(handler));
 *
 * Cache key = 'route:<method>:<path>?<querystring>'
 * For user-scoped routes, pass { perUser: true } to scope by user ID.
 *
 * On cache hit:  returns JSON immediately, skips DB.
 * On cache miss: runs the handler, then caches the response body.
 * If Redis is unavailable: transparent no-op (handler always runs).
 */

const redis = require('../config/redis');
const logger = require('../config/logger');

/**
 * @param {number} ttlSeconds  - How long to cache the response
 * @param {object} [opts]
 * @param {boolean} [opts.perUser=false] - Scope cache key to req.user.id
 */
function cache(ttlSeconds, { perUser = false } = {}) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const userScope = perUser && req.user ? `:u${req.user.id}` : '';
    const qs        = Object.keys(req.query).length
      ? '?' + new URLSearchParams(req.query).toString()
      : '';
    const key = `route:${req.path}${userScope}${qs}`;

    // ── Cache hit ──────────────────────────────────────────────────────
    const cached = await redis.get(key);
    if (cached !== null) {
      logger.debug(`Cache HIT: ${key}`);
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // ── Cache miss — intercept res.json to store the response ──────────
    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await redis.set(key, body, ttlSeconds);
        logger.debug(`Cache SET: ${key} (${ttlSeconds}s)`);
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = { cache };
