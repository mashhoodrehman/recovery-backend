const env = require('../config/env');
const logger = require('../utils/logger');

// Lazy singleton, same pattern as stripe.service.js / notification.service.js's firebase hookup.
// When REDIS_URL is unset, every caller falls back to in-memory state — fine for a single
// process, but only Redis-backed state survives a restart or is visible across pm2 cluster workers.
let client = null;
let initTried = false;

const getClient = () => {
  if (initTried) return client;
  initTried = true;
  if (!env.redis.url) {
    logger.warn('REDIS_URL not set — tower presence/location falls back to in-memory (single process only)');
    return null;
  }
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const Redis = require('ioredis');
  client = new Redis(env.redis.url, { maxRetriesPerRequest: 3, lazyConnect: false });
  client.on('error', (err) => logger.error(`Redis error: ${err.message}`));
  client.on('connect', () => logger.info('Redis connected'));
  return client;
};

module.exports = { getClient };
