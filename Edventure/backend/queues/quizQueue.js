import { Queue } from 'bullmq';

// BullMQ connection configuration (requires maxRetriesPerRequest: null)
export const queueConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null
};

// Create the asynchronous quiz generation queue
export const quizQueue = new Queue('quiz-generation', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000 // 2s, 4s, 8s backoff on rate limits
    },
    removeOnComplete: 100, // Keep last 100 completed jobs in Redis for audit
    removeOnFail: 500 // Keep last 500 failed jobs for Dead-Letter inspection
  }
});

/**
 * Dispatch a quiz generation job to the background queue
 */
export async function dispatchQuizJob({ gameId, subject, difficulty, classLevel, players }) {
  console.log(`📥 [BullMQ] Queuing quiz generation job for game ${gameId}`);
  return await quizQueue.add('generate-quiz-job', {
    gameId,
    subject,
    difficulty,
    classLevel,
    players
  });
}

export default quizQueue;
