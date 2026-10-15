import mongoose from 'mongoose';
import { redis } from '../redisClient.js';
import { quizQueue } from '../queues/quizQueue.js';
import User from '../models/User.js';
import PracticeQuestion from '../models/PracticeQuestion.js';
import CourseDocument from '../models/CourseDocument.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Get comprehensive real-time system metrics: Redis, BullMQ, MongoDB, and throughput
 */
export const getSystemMetrics = asyncHandler(async (req, res) => {
  const startTime = Date.now();

  // 1. Redis Metrics
  let redisPing = 'N/A';
  let redisMemory = 'N/A';
  let redisKeysCount = 0;
  try {
    const pingStart = Date.now();
    await redis.ping();
    redisPing = `${Date.now() - pingStart}ms`;

    const rawInfo = await redis.info('memory');
    const match = rawInfo.match(/used_memory_human:([^\r\n]+)/);
    if (match) redisMemory = match[1];

    redisKeysCount = await redis.dbsize();
  } catch (err) {
    redisPing = `Error: ${err.message}`;
  }

  // 2. BullMQ Job Counts
  let queueStats = {};
  try {
    queueStats = await quizQueue.getJobCounts('active', 'completed', 'failed', 'delayed', 'waiting');
  } catch (qErr) {
    queueStats = { error: qErr.message };
  }

  // 3. Database Entity Counts
  const [userCount, questionCount, documentCount] = await Promise.all([
    User.countDocuments(),
    PracticeQuestion.countDocuments(),
    CourseDocument.countDocuments()
  ]);

  // 4. Node.js Process & Memory
  const memUsage = process.memoryUsage();
  const processStats = {
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    rssMemory: `${(memUsage.rss / 1024 / 1024).toFixed(1)} MB`,
    heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
    heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`
  };

  const metrics = {
    status: 'healthy',
    responseTime: `${Date.now() - startTime}ms`,
    timestamp: new Date().toISOString(),
    system: processStats,
    redis: {
      status: redis.status,
      ping: redisPing,
      memoryUsed: redisMemory,
      totalKeys: redisKeysCount
    },
    bullmqQueue: {
      queueName: 'quiz-generation',
      jobs: queueStats
    },
    database: {
      mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      totalUsers: userCount,
      totalPracticeQuestions: questionCount,
      totalCourseDocuments: documentCount
    }
  };

  return res.json(new ApiResponse(200, metrics, 'System metrics retrieved successfully'));
});
