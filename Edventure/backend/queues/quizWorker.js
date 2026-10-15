import { Worker } from 'bullmq';
import { queueConnection } from './quizQueue.js';
import { generateQuestions } from '../controllers/battlegroundsController.js';
import { redis } from '../redisClient.js';
import PracticeQuestion from '../models/PracticeQuestion.js';

// Fallback loader if all AI retries fail
async function loadStaticFallbackQuestions(subject, difficulty, classLevel) {
  try {
    const classNum = parseInt(classLevel, 10);
    const questions = await PracticeQuestion.aggregate([
      {
        $match: {
          subject: subject.toLowerCase(),
          difficulty: difficulty.toLowerCase(),
          classLevel: classNum
        }
      },
      { $sample: { size: 5 } }
    ]);

    if (questions && questions.length > 0) {
      return questions;
    }

    // Secondary fallback: any available questions
    return await PracticeQuestion.aggregate([{ $sample: { size: 5 } }]);
  } catch (err) {
    console.error('❌ Error loading fallback questions from MongoDB:', err.message);
    return [];
  }
}

/**
 * Initializes the BullMQ Worker for processing AI Quiz Generation jobs
 * 
 * @param {Object} io - Socket.io Server instance for cross-cluster event emission
 */
export function initQuizWorker(io) {
  const worker = new Worker(
    'quiz-generation',
    async (job) => {
      const { gameId, subject, difficulty, classLevel, players, documentId } = job.data;
      console.log(`⚙️ [BullMQ Worker] Processing quiz generation for game ${gameId} (Attempt: ${job.attemptsMade + 1})`);

      let questions = [];
      try {
        // If this is a Syllabus Showdown custom match, extract questions grounded in the uploaded document
        if (documentId) {
          try {
            const DocumentChunk = (await import('../models/DocumentChunk.js')).default;
            const chunks = await DocumentChunk.find({ documentId }).limit(10).lean();
            if (chunks && chunks.length > 0) {
              const { generateQuizFromChunks } = await import('../services/ragService.js');
              questions = await generateQuizFromChunks({
                chunks,
                subject,
                classLevel,
                documentTitle: 'Syllabus Arena'
              });
              console.log(`📚 [BullMQ Worker] Grounded ${questions.length} questions in Syllabus Document ${documentId}`);
            }
          } catch (docErr) {
            console.warn(`⚠️ [BullMQ Worker] Document question extraction failed: ${docErr.message}, falling back`);
          }
        }

        // Standard AI generation (with internal Redis question cache)
        if (!questions || questions.length === 0) {
          questions = await generateQuestions(subject, difficulty, classLevel);
        }
      } catch (aiErr) {
        console.warn(`⚠️ [BullMQ Worker] AI attempt failed: ${aiErr.message}`);

        // If this is the final attempt, use static fallback from PracticeQuestion DB
        if (job.attemptsMade >= 2) {
          console.log(`🔄 [BullMQ Worker] Falling back to database questions for game ${gameId}`);
          questions = await loadStaticFallbackQuestions(subject, difficulty, classLevel);
        } else {
          // Rethrow to trigger BullMQ exponential retry
          throw aiErr;
        }
      }

      // Update room state in Redis with the generated questions
      const rawRoom = await redis.get(`gameroom:${gameId}`);
      if (rawRoom) {
        const roomState = JSON.parse(rawRoom);
        roomState.questions = questions;
        roomState.status = 'active';
        await redis.setex(`gameroom:${gameId}`, 1800, JSON.stringify(roomState));
      }

      // Store questions with gameId key for API retrieval
      await redis.setex(`game:${gameId}:questions`, 7200, JSON.stringify(questions));

      // Sanitize questions: strip correctAnswer and explanation so clients cannot inspect answer keys in DevTools
      const sanitizedQuestions = questions.map((q) => {
        const { correctAnswer, explanation, ...clientSafeQ } = q;
        return clientSafeQ;
      });

      // Emit game-start to both players via Socket.io Redis adapter
      if (io && players && Array.isArray(players)) {
        players.forEach((player) => {
          if (!player.isBot) {
            const opponent = players.find((p) => p.socketId !== player.socketId)?.userData;
            io.to(player.socketId).emit('game-start', {
              gameId,
              opponent,
              subject,
              difficulty,
              classLevel,
              questions: sanitizedQuestions
            });
          }
        });

        // If one of the players is an AI Bot Rival, start automated realistic answering simulation
        const botPlayer = players.find((p) => p.isBot);
        const humanPlayer = players.find((p) => !p.isBot);
        if (botPlayer && humanPlayer) {
          simulateBotResponses(io, gameId, botPlayer, humanPlayer, questions, redis);
        }
      }

      console.log(`✅ [BullMQ Worker] Game ${gameId} questions successfully delivered to players!`);
      return { gameId, questionCount: questions.length };
    },
    {
      connection: queueConnection,
      concurrency: 5 // Process up to 5 games in parallel without blocking Node event loop
    }
  );

// Helper function to simulate realistic human-like bot responses during 1v1 battle
function simulateBotResponses(io, gameId, botPlayer, humanPlayer, questions, redis) {
  let botScore = 0;
  let qIdx = 0;

  function runNextQuestion() {
    if (qIdx >= questions.length) return;

    const currentQ = questions[qIdx];
    // Realistic human response delay: 6 to 11 seconds
    const responseDelayMs = Math.floor(6000 + Math.random() * 5000);

    setTimeout(async () => {
      // 75% accuracy simulation
      const isCorrect = Math.random() < 0.75;
      const pts = isCorrect ? (currentQ.points || 10) : 0;
      botScore += pts;

      // Notify human player of bot's live answer
      io.to(humanPlayer.socketId).emit('opponent-answered', {
        questionIndex: qIdx,
        opponentScore: botScore
      });

      // Update room state in Redis
      try {
        const raw = await redis.get(`gameroom:${gameId}`);
        if (raw) {
          const game = JSON.parse(raw);
          if (!game.scores) game.scores = {};
          game.scores[botPlayer.socketId] = botScore;

          if (qIdx === questions.length - 1) {
            if (!game.completed) game.completed = {};
            game.completed[botPlayer.socketId] = true;
          }
          await redis.setex(`gameroom:${gameId}`, 1800, JSON.stringify(game));
        }
      } catch (e) {}

      qIdx++;
      if (qIdx < questions.length) {
        runNextQuestion();
      }
    }, responseDelayMs);
  }

  runNextQuestion();
}

  worker.on('completed', (job) => {
    console.log(`🎉 [BullMQ] Job ${job.id} completed for game ${job.data.gameId}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 [BullMQ] Job ${job?.id} failed for game ${job?.data?.gameId}: ${err.message}`);
  });

  return worker;
}

export default initQuizWorker;
