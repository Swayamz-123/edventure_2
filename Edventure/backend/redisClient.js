import Redis from 'ioredis';

// Connect to Redis (defaults to localhost:6379, or reads from REDIS_URL)
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully on port 6379');
});

redis.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
});

// Dedicated publisher and subscriber clients for Socket.io Redis Adapter
export const pubClient = redis.duplicate();
export const subClient = redis.duplicate();

export default redis;
