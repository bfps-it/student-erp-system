const Redis = require('ioredis');
const logger = require('../utils/logger');

/**
 * BFPS ERP - Redis Client (Upstash)
 * Used for: rate limiting, session cache, OTP storage, and general caching.
 */

let redis = null;

function createRedisClient() {
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not set. Redis features will be disabled.');
    return null;
  }

  try {
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      enableReadyCheck: true,
      connectTimeout: 10000,
      lazyConnect: true,
    });

    client.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    client.on('ready', () => {
      logger.info('Redis ready');
    });

    client.on('error', (err) => {
      logger.error(`Redis error: ${err.message}`);
    });

    client.on('close', () => {
      logger.warn('Redis connection closed');
    });

    return client;
  } catch (error) {
    logger.error(`Failed to create Redis client: ${error.message}`);
    return null;
  }
}

/**
 * Connect to Redis
 */
async function connectRedis() {
  redis = createRedisClient();
  if (redis) {
    try {
      await redis.connect();
      // Test connection
      await redis.ping();
      logger.info('Redis PING successful');
    } catch (error) {
      logger.error(`Redis connection failed: ${error.message}`);
      redis = null;
    }
  }
  return redis;
}

/**
 * Disconnect from Redis
 */
async function disconnectRedis() {
  if (redis) {
    await redis.disconnect();
    logger.info('Redis disconnected');
  }
}

/**
 * Get Redis client (returns null if not connected)
 */
function getRedis() {
  return redis;
}

/**
 * Cache helper - get with fallback
 * @param {string} key - Cache key
 * @param {Function} fallback - Function to call on cache miss
 * @param {number} ttl - Time to live in seconds (default: 300 = 5min)
 */
async function cacheGet(key, fallback, ttl = 300) {
  if (!redis) {
    return fallback();
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await fallback();
    await redis.setex(key, ttl, JSON.stringify(result));
    return result;
  } catch (error) {
    logger.error(`Cache error for key ${key}: ${error.message}`);
    return fallback();
  }
}

/**
 * Cache helper - invalidate
 * @param {string} pattern - Key pattern to invalidate (e.g., 'students:*')
 */
async function cacheInvalidate(pattern) {
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug(`Cache invalidated: ${keys.length} keys matching '${pattern}'`);
    }
  } catch (error) {
    logger.error(`Cache invalidation error for pattern ${pattern}: ${error.message}`);
  }
}

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedis,
  cacheGet,
  cacheInvalidate,
};
