/**
 * Lightweight in-process performance metrics middleware.
 *
 * Tracks per-request latency, status code distribution, and per-route
 * stats without any external infrastructure. Metrics are kept in memory
 * and reset when the process restarts.
 *
 * Exposed via GET /api/health/metrics (admin-only).
 */

const os = require('os');

// ── In-memory store ───────────────────────────────────────────────────────────

const store = {
  startTime:    Date.now(),
  totalRequests:  0,
  activeRequests: 0,

  // HTTP status code buckets
  statusCodes: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },

  // Latency histogram buckets (ms)
  latencyBuckets: { '<50': 0, '<200': 0, '<500': 0, '<1000': 0, '>=1000': 0 },

  // Rolling window: last 1000 response times (ms) for p50/p95/p99
  recentLatencies: [],

  // Per-route breakdown — top 20 by request count
  routes: {},
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function recordLatency(ms) {
  if      (ms < 50)   store.latencyBuckets['<50']++;
  else if (ms < 200)  store.latencyBuckets['<200']++;
  else if (ms < 500)  store.latencyBuckets['<500']++;
  else if (ms < 1000) store.latencyBuckets['<1000']++;
  else                store.latencyBuckets['>=1000']++;

  store.recentLatencies.push(ms);
  if (store.recentLatencies.length > 1000) store.recentLatencies.shift();
}

function recordRoute(method, path, statusCode, ms) {
  const key = `${method} ${path}`;
  if (!store.routes[key]) {
    store.routes[key] = { count: 0, errors: 0, totalMs: 0 };
  }
  const r = store.routes[key];
  r.count++;
  r.totalMs += ms;
  if (statusCode >= 400) r.errors++;
}

// ── Middleware ────────────────────────────────────────────────────────────────

function metricsMiddleware(req, res, next) {
  const start = Date.now();
  store.totalRequests++;
  store.activeRequests++;

  res.on('finish', () => {
    const ms     = Date.now() - start;
    const status = res.statusCode;
    store.activeRequests--;

    // Status bucket
    const bucket = `${Math.floor(status / 100)}xx`;
    if (store.statusCodes[bucket] !== undefined) store.statusCodes[bucket]++;

    recordLatency(ms);

    // Normalise route — replace ObjectId-like segments with :id
    const routePath = (req.route?.path || req.path)
      .replace(/\/[0-9a-f]{24}/gi, '/:id')
      .replace(/\/\d+/g, '/:n');

    recordRoute(req.method, routePath, status, ms);
  });

  next();
}

// ── Snapshot builder ──────────────────────────────────────────────────────────

function getMetrics() {
  const uptimeSec  = Math.floor((Date.now() - store.startTime) / 1000);
  const sorted     = [...store.recentLatencies].sort((a, b) => a - b);
  const errorRate  = store.totalRequests > 0
    ? +((store.statusCodes['4xx'] + store.statusCodes['5xx']) / store.totalRequests * 100).toFixed(2)
    : 0;

  // Top 10 slowest routes by average latency
  const routeStats = Object.entries(store.routes)
    .map(([route, r]) => ({
      route,
      requests: r.count,
      errors:   r.errors,
      avgMs:    r.count > 0 ? Math.round(r.totalMs / r.count) : 0,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 10);

  const mem = process.memoryUsage();

  return {
    process: {
      uptimeSec,
      uptimeFormatted: formatUptime(uptimeSec),
      nodeVersion:     process.version,
      pid:             process.pid,
      heapUsedMB:      Math.round(mem.heapUsed  / 1024 / 1024),
      heapTotalMB:     Math.round(mem.heapTotal / 1024 / 1024),
      rssMB:           Math.round(mem.rss       / 1024 / 1024),
    },
    system: {
      cpuCount:   os.cpus().length,
      loadAvg:    os.loadavg().map(v => +v.toFixed(2)),
      freeMB:     Math.round(os.freemem()  / 1024 / 1024),
      totalMB:    Math.round(os.totalmem() / 1024 / 1024),
      platform:   os.platform(),
    },
    requests: {
      total:         store.totalRequests,
      active:        store.activeRequests,
      errorRatePct:  errorRate,
      statusCodes:   { ...store.statusCodes },
    },
    latency: {
      p50Ms:   percentile(sorted, 50),
      p95Ms:   percentile(sorted, 95),
      p99Ms:   percentile(sorted, 99),
      buckets: { ...store.latencyBuckets },
    },
    slowestRoutes: routeStats,
  };
}

function formatUptime(sec) {
  if (sec < 60)   return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

module.exports = { metricsMiddleware, getMetrics };
