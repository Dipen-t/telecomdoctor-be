import { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../infrastructure/redis/redis';

/**
 * Creates a rate limiter middleware for a given endpoint.
 * Uses a simple fixed window approach via Redis.
 */
export function rateLimiter(limit: number, windowSeconds: number) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Identify user by IP or User ID if authenticated
    const identifier = request.user?.userId || request.ip;
    const route = request.routeOptions.url;
    
    // Key format: rate_limit:{route}:{identifier}
    const key = `rate_limit:${route}:${identifier}`;

    // Increment count
    const currentCount = await redis.incr(key);

    // If it's the first request in the window, set expiry
    if (currentCount === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (currentCount > limit) {
      return reply.code(429).send({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded. Please try again later.'
        }
      });
    }
  };
}
