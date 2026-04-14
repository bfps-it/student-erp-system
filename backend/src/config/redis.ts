import Redis from 'ioredis';

import logger from '../utils/logger';

/**
 * BFPS ERP - Redis Client / Upstash (TypeScript)
 * Used for: rate limiting, session cache, OTP storage, and general caching.
 */

let redis: Redis | null = null;

function createRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not set. Redis features will be disabled.');
    return null;
  }

  try {
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number): number {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      enableReadyCheck: true,
      connectTimeout: 10000,
      lazyConnect: true,
    });

    client.on('connect', (): void => {
      logger.info('Redis connected successfully');
    });

    client.on('ready', (): void => {
      logger.info('Redis ready');
    });

    client.on('error', (err: Error): void => {
      logger.error(`Redis error: ${err.message}`);
    });

    client.on('close', (): void => {
      logger.warn('Redis connection closed');
    });

    return client;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to create Redis client: ${message}`);
    return null;
  }
}

/**
 * Connect to Redis
 */
async function connectRedis(): Promise<Redis | null> {
  redis = createRedisClient();
  if (redis) {
    try {
      await redis.connect();
      await redis.ping();
      logger.info('Redis PING successful');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Redis connection failed: ${message}`);
      redis = null;
    }
  }
  return redis;
}

/**
 * Disconnect from Redis
 */
async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.disconnect();
    logger.info('Redis disconnected');
  }
}

/**
 * Get Redis client (returns null if not connected)
 */
function getRedis(): Redis | null {
  return redis;
}

/**
 * Cache helper - get with fallback
 */
async function cacheGet<T>(key: string, fallback: () => Promise<T>, ttl: number = 300): Promise<T> {
  if (!redis) {
    return fallback();
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    const result = await fallback();
    await redis.setex(key, ttl, JSON.stringify(result));
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Cache error for key ${key}: ${message}`);
    return fallback();
  }
}

/**
 * Cache helper - invalidate
 */
async function cacheInvalidate(pattern: string): Promise<void> {
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug(`Cache invalidated: ${keys.length} keys matching '${pattern}'`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Cache invalidation error for pattern ${pattern}: ${message}`);
  }
}

export { connectRedis, disconnectRedis, getRedis, cacheGet, cacheInvalidate };
