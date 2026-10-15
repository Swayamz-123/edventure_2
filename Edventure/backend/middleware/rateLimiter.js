import { redis } from '../redisClient.js';

/**
 * Creates a Distributed Sliding-Window Rate Limiter using Redis.
 * 
 * @param {Object} options
 * @param {string} options.prefix - Redis key prefix (e.g., 'rl:chatbot', 'rl:auth')
 * @param {number} options.limit - Max requests allowed in the window
 * @param {number} options.windowSeconds - Window duration in seconds (e.g., 60 for 1 minute)
 * @param {string} options.message - Custom error message on 429
 */
export function createRateLimiter({ prefix = 'rl:general', limit = 60, windowSeconds = 60, message }) {
  return async function rateLimiterMiddleware(req, res, next) {
    try {
      // Identify user by authenticated User ID, or fallback to Client IP
      const identifier = req.user ? req.user._id.toString() : (req.ip || req.headers['x-forwarded-for'] || 'anonymous');
      const now = Date.now();
      const windowStart = now - windowSeconds * 1000;
      const key = `${prefix}:${identifier}`;

      // Use a Redis Transaction (MULTI) with a Sorted Set (ZSET) for a precise Sliding Window:
      // 1. Remove timestamps older than the sliding window
      // 2. Count requests in the current window
      // 3. Add current request timestamp
      // 4. Set auto-expiration on the key
      const multi = redis.multi();
      multi.zremrangebyscore(key, 0, windowStart);
      multi.zcard(key);
      multi.zadd(key, now, `${now}-${Math.random()}`);
      multi.expire(key, windowSeconds);

      const results = await multi.exec();

      // results[1][1] is the result of zcard (number of requests in the window)
      const currentRequestCount = results[1][1];

      // Set standard RFC-compliant rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - currentRequestCount - 1));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowSeconds * 1000) / 1000));

      if (currentRequestCount >= limit) {
        res.setHeader('Retry-After', windowSeconds);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: message || `Rate limit exceeded. Please wait ${windowSeconds} seconds before trying again.`,
          retryAfterSeconds: windowSeconds
        });
      }

      next();
    } catch (err) {
      // Fail-open strategy: If Redis has a hiccup, log the error but don't block legitimate users
      console.error('Rate Limiter Redis Error (failing open):', err.message);
      next();
    }
  };
}

// Pre-configured rate limiters for different sensitivity levels
export const chatbotLimiter = createRateLimiter({
  prefix: 'rl:chatbot',
  limit: 15, // 15 questions per minute
  windowSeconds: 60,
  message: '⏳ You are asking questions too fast! Please wait a moment before sending another message to ERA.'
});

export const authLimiter = createRateLimiter({
  prefix: 'rl:auth',
  limit: 5, // 5 login/register attempts per 5 minutes to prevent brute-force
  windowSeconds: 300,
  message: '🔒 Too many authentication attempts. Please try again in 5 minutes.'
});

export const aiQuestionLimiter = createRateLimiter({
  prefix: 'rl:ai_gen',
  limit: 10, // 10 quiz generations per minute
  windowSeconds: 60,
  message: '⏳ Quiz generation limit reached. Please wait a minute before requesting more questions.'
});
