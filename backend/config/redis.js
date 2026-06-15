/**
 * Redis client with graceful fallback.
 *
 * If REDIS_URL is not set or the server is unreachable, every cache
 * operation silently no-ops so the app works exactly as without Redis.
 *
 * Usage:
 *   const redis = require('./config/redis');
 *   await redis.get(key)          // null if unavailable
 *   await redis.set(key, val, ttlSeconds)
 *   await redis.del(key)
 *   await redis.delPattern('prefix:*')
 */

const logger = require('./logger');

// ── Client setup ──────────────────────────────────────────────────────────────

let client = null;
let available = false;

if (process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis');

    client = new Redis(process.env.REDIS_URL, {
      // Don't retry forever — fail fast if Redis is down
      maxRetriesPerRequest:  2,
      retryStrategy: (times) => (times <= 2 ? Math.min(times * 200, 1000) : null),
      enableReadyCheck:      true,
      lazyConnect:           true,
    });

    client.on('ready', () => {
      available = true;
      logger.info('Redis connected and ready');
    });

    client.on('error', (err) => {
      available = false;
      logger.warn(`Redis error — caching disabled: ${err.message}`);
    });

    client.on('close', () => {
      available = false;
    });

    // Attempt connection (non-blocking)
    client.connect().catch((err) => {
      logger.warn(`Redis unavailable — running without cache: ${err.message}`);
    });

  } catch (err) {
    logger.warn(`Redis init failed — running without cache: ${err.message}`);
    client = null;
  }
} else {
  logger.debug('REDIS_URL not set — caching disabled');
}

// ── TTL constants (seconds) ───────────────────────────────────────────────────

const TTL = {
  SHORT:       60,        //  1 minute  — frequently changing data (admin dashboard)
  MEDIUM:      5 * 60,    //  5 minutes — question lists
  LONG:        15 * 60,   // 15 minutes — categories, static content
  USER:        2 * 60,    //  2 minutes — per-user stats
};

// ── Wrapper helpers ───────────────────────────────────────────────────────────

async function get(key) {
  if (!available || !client) return null;
  try {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    logger.debug(`Redis GET failed for ${key}: ${err.message}`);
    return null;
  }
}

async function set(key, value, ttlSeconds = TTL.MEDIUM) {
  if (!available || !client) return;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.debug(`Redis SET failed for ${key}: ${err.message}`);
  }
}

async function del(...keys) {
  if (!available || !client) return;
  try {
    await client.del(...keys);
  } catch (err) {
    logger.debug(`Redis DEL failed: ${err.message}`);
  }
}

/**
 * Delete all keys matching a glob pattern (e.g. 'questions:*').
 * Uses SCAN to avoid blocking the server.
 */
async function delPattern(pattern) {
  if (!available || !client) return;
  try {
    let cursor = '0';
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length) await client.del(...keys);
    } while (cursor !== '0');
  } catch (err) {
    logger.debug(`Redis SCAN/DEL failed for pattern ${pattern}: ${err.message}`);
  }
}

function isAvailable() {
  return available;
}

module.exports = { get, set, del, delPattern, isAvailable, TTL };
