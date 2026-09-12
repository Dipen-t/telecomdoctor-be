import Redis from 'ioredis';
import fastifyRateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';

// Connect to Redis for distributed rate limiting
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: 1, // Don't hang forever if Redis dies
  retryStrategy(times) {
    // Stop retrying after 3 attempts to fail-open quickly
    if (times > 3) {
      return null;
    }
    return Math.min(times * 50, 2000);
  }
});

let isRedisConnected = false;

redis.on('ready', () => {
  isRedisConnected = true;
});

redis.on('error', (err) => {
  // If Redis fails, we log it but don't crash. 
  // We'll fall back to memory or fail-open.
  isRedisConnected = false;
  console.warn('[RateLimiter] Redis connection error, failing open:', err.message);
});

export async function setupRateLimiter(server: FastifyInstance) {
  await server.register(fastifyRateLimit, {
    max: 100, // 100 requests
    timeWindow: '1 minute',
    redis: redis, // Use redis store
    
    // FAIL OPEN MECHANISM (Crucial for production reliability)
    // If Redis is down, we allow the request through so the core API still works.
    continueExceeding: true, 
    skipOnError: true,
    
    keyGenerator: (request) => {
      // Rate limit based on IP, or user ID if authenticated
      if (request.user?.userId) {
        return request.user.userId;
      }
      return request.ip;
    }
  });
}
