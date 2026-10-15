import jwt from 'jsonwebtoken';
import { dispatchQuizJob } from './queues/quizQueue.js';
import PracticeQuestion from './models/PracticeQuestion.js';
import { getLeaderboardKeys } from './controllers/authController.js';

export default function registerGameHandlers(io, generateQuestions, User, redis) {
  // Helper to load questions (AI with Redis Cache or database fallback)
  async function loadQuestions(subject, difficulty, classLevel) {
    try {
      console.log(`🤖 Generating ${subject} questions for ${difficulty} difficulty, class ${classLevel} using AI...`);
      const questions = await generateQuestions(subject, difficulty, classLevel);
      console.log(`✅ Generated ${questions.length} questions using AI`);
      return questions;
    } catch (error) {
      console.error('❌ Error generating questions with AI:', error.message);
      console.log('🔄 Falling back to database questions from PracticeQuestion collection...');
      try {
        const classNum = parseInt(classLevel, 10);
        const stored = await PracticeQuestion.aggregate([
          {
            $match: {
              subject: subject.toLowerCase(),
              difficulty: difficulty.toLowerCase(),
              classLevel: classNum
            }
          },
          { $sample: { size: 5 } }
        ]);

        if (stored && stored.length > 0) {
          return stored;
        }

        // Secondary fallback: any available questions in the database
        return await PracticeQuestion.aggregate([{ $sample: { size: 5 } }]);
      } catch (fallbackError) {
        console.error('❌ Database fallback also failed:', fallbackError.message);
        return [];
      }
    }
  }

  io.on('connection', (socket) => {
    console.log('⚡ Socket connected:', socket.id);

    // ==========================================
    // 1. JOIN LOBBY (Distributed Redis Queue)
    // ==========================================
    socket.on('join-lobby', async (data) => {
      const cookieToken = socket.handshake.headers.cookie
        ?.split(';')
        .find((c) => c.trim().startsWith('accessToken='))
        ?.split('=')[1];

      const token = socket.handshake.auth?.token || cookieToken;

      let decoded = null;
      if (token) {
        try {
          decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        } catch (jwtErr) {}
      }

      // If token is missing/expired, reject socket join
      if (!decoded) {
        console.log('❌ No valid JWT token found for battlegrounds socket');
        socket.emit('auth-error', { message: 'Authentication required. Please log in.' });
        return;
      }

      // Enforce server-side verified identity from cryptographic JWT
      const verifiedUserId = decoded._id.toString();
      const verifiedUsername = decoded.username || decoded.name || data.username || 'Hero';

      const { subject, difficulty, classLevel, mode } = data;
      socket.userData = {
        userId: verifiedUserId,
        username: verifiedUsername,
        subject,
        difficulty,
        classLevel,
        mode
      };

      const roomKey = `${subject}-${difficulty}-${classLevel}-${mode}`.toLowerCase();
      const lobbyQueueKey = `lobby:queue:${roomKey}`;
      const lobbyUsersKey = `lobby:users:${roomKey}`;

      try {
        // Prevent duplicate queue joins using a Redis Set
        const alreadyInLobby = await redis.sismember(lobbyUsersKey, verifiedUserId);
        if (alreadyInLobby) {
          console.log(`⚠️ User ${verifiedUsername} already queued in lobby ${roomKey}`);
          socket.emit('already-in-room', { roomKey });
          return;
        }

        // Add player to the distributed Redis queue & active tracking set
        const playerPayload = JSON.stringify({ socketId: socket.id, userData: socket.userData });
        await redis.rpush(lobbyQueueKey, playerPayload);
        await redis.sadd(lobbyUsersKey, userId);
        await redis.setex(`socket:user:${socket.id}`, 3600, JSON.stringify({ userId, roomKey }));

        socket.join(roomKey);
        const queueLength = await redis.llen(lobbyQueueKey);
        console.log(`🎯 ${username} joined lobby [${roomKey}]. Players waiting in Redis: ${queueLength}`);

        // Check if at least 2 players are waiting
        if (queueLength >= 2) {
          console.log(`🎮 Match found in Redis queue for [${roomKey}]!`);

          // Atomically pop first 2 players from Redis
          const p1Raw = await redis.lpop(lobbyQueueKey);
          const p2Raw = await redis.lpop(lobbyQueueKey);

          if (!p1Raw || !p2Raw) {
            // Re-queue if concurrency race occurred
            if (p1Raw) await redis.lpush(lobbyQueueKey, p1Raw);
            return;
          }

          const p1 = JSON.parse(p1Raw);
          const p2 = JSON.parse(p2Raw);

          // Clean up user tracking set
          await redis.srem(lobbyUsersKey, p1.userData.userId, p2.userData.userId);

          const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

          // 1. Initial room state stored in Redis (status: preparing_arena)
          const roomState = {
            id: gameId,
            players: [p1, p2],
            subject,
            difficulty,
            classLevel,
            mode,
            questions: [],
            status: 'preparing_arena',
            currentQuestion: 0,
            scores: { [p1.socketId]: 0, [p2.socketId]: 0 },
            answers: { [p1.socketId]: [], [p2.socketId]: [] },
            completed: { [p1.socketId]: false, [p2.socketId]: false }
          };

          await redis.setex(`gameroom:${gameId}`, 1800, JSON.stringify(roomState));
          await redis.setex(`socket:game:${p1.socketId}`, 1800, gameId);
          await redis.setex(`socket:game:${p2.socketId}`, 1800, gameId);

          // 2. Immediately notify both players that an opponent has been found!
          [p1, p2].forEach((player) => {
            const opponent = player.socketId === p1.socketId ? p2.userData : p1.userData;
            io.to(player.socketId).emit('match-found', {
              gameId,
              opponent,
              subject,
              difficulty,
              classLevel,
              mode,
              message: 'Opponent matched! Generating your battleground arena...'
            });
          });

          // 3. Offload AI quiz generation to BullMQ message queue!
          // Worker generates questions with exponential retry, updates Redis, and emits 'game-start'
          await dispatchQuizJob({
            gameId,
            subject,
            difficulty,
            classLevel,
            players: [p1, p2]
          });

          console.log(`✅ [BullMQ Job Dispatched] Game ${gameId} arena generation offloaded to worker`);
        } else {
          socket.emit('waiting-for-opponent', { position: queueLength });

          // Zero-Wait Matchmaking: If no human opponent arrives in 8 seconds, spawn an AI Rival!
          setTimeout(async () => {
            try {
              const stillWaiting = await redis.sismember(lobbyUsersKey, userId);
              if (!stillWaiting) return; // Player already paired or disconnected

              // Remove user from Redis queue
              await redis.lrem(lobbyQueueKey, 1, playerPayload);
              await redis.srem(lobbyUsersKey, userId);

              const botNames = ['TeslaBot_AI ⚡', 'NewtonBot_AI 🍎', 'CurieBot_AI 🔬', 'RamanBot_AI 📐', 'AdaBot_AI 💻'];
              const chosenBot = botNames[Math.floor(Math.random() * botNames.length)];
              const botPlayer = {
                socketId: `bot_${Date.now()}`,
                userData: {
                  userId: 'bot_' + Math.random().toString(36).substring(2, 8),
                  username: chosenBot,
                  avatar: '🤖',
                  points: Math.floor(250 + Math.random() * 300),
                  title: 'AI Rival'
                },
                isBot: true
              };

              const humanPlayer = { socketId: socket.id, userData: socket.userData };
              const botGameId = `game_bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

              const botRoomState = {
                id: botGameId,
                players: [humanPlayer, botPlayer],
                subject,
                difficulty,
                classLevel,
                mode,
                questions: [],
                status: 'preparing_arena',
                currentQuestion: 0,
                scores: { [humanPlayer.socketId]: 0, [botPlayer.socketId]: 0 },
                answers: { [humanPlayer.socketId]: [], [botPlayer.socketId]: [] },
                completed: { [humanPlayer.socketId]: false, [botPlayer.socketId]: false }
              };

              await redis.setex(`gameroom:${botGameId}`, 1800, JSON.stringify(botRoomState));
              await redis.setex(`socket:game:${humanPlayer.socketId}`, 1800, botGameId);

              console.log(`🤖 [Zero-Wait Matchmaking] Spawned ${chosenBot} for ${username} in game ${botGameId}`);

              socket.emit('match-found', {
                gameId: botGameId,
                opponent: botPlayer.userData,
                subject,
                difficulty,
                classLevel,
                mode,
                message: `Opponent matched: ${chosenBot}! Generating your arena...`
              });

              await dispatchQuizJob({
                gameId: botGameId,
                subject,
                difficulty,
                classLevel,
                players: [humanPlayer, botPlayer]
              });
            } catch (botErr) {
              console.error('AI Bot opponent spawn error:', botErr.message);
            }
          }, 8000);
        }
      } catch (err) {
        console.error('Redis Matchmaking error:', err.message);
        socket.emit('error', { message: 'Matchmaking error. Please try again.' });
      }
    });

    // ==========================================
    // SYLLABUS SHOWDOWN (Private 6-Digit Code Room)
    // ==========================================
    socket.on('create-custom-room', async (data) => {
      if (!socket.userData) {
        socket.emit('auth-error', { message: 'Authentication required' });
        return;
      }

      const { subject, difficulty = 'medium', classLevel = 10, documentId, title } = data;
      const roomCode = `EDV-${Math.floor(1000 + Math.random() * 9000)}`;

      const customRoomData = {
        roomCode,
        host: { socketId: socket.id, userData: socket.userData },
        subject,
        difficulty,
        classLevel,
        documentId,
        title: title || 'Custom Arena'
      };

      await redis.setex(`customroom:${roomCode}`, 3600, JSON.stringify(customRoomData));
      socket.emit('custom-room-created', { roomCode, customRoomData });
      console.log(`🏰 Custom Syllabus Arena created: ${roomCode} for document: ${documentId || 'general'}`);
    });

    socket.on('join-custom-room', async ({ roomCode }) => {
      if (!socket.userData) {
        socket.emit('auth-error', { message: 'Authentication required' });
        return;
      }

      const raw = await redis.get(`customroom:${roomCode}`);
      if (!raw) {
        socket.emit('custom-room-error', { message: 'Invalid or expired 6-digit room code' });
        return;
      }

      const customRoom = JSON.parse(raw);
      await redis.del(`customroom:${roomCode}`);

      const host = customRoom.host;
      const guest = { socketId: socket.id, userData: socket.userData };
      const gameId = `custom_${roomCode}_${Date.now()}`;

      const roomState = {
        id: gameId,
        players: [host, guest],
        subject: customRoom.subject,
        difficulty: customRoom.difficulty,
        classLevel: customRoom.classLevel,
        documentId: customRoom.documentId,
        mode: 'custom-showdown',
        questions: [],
        status: 'preparing_arena',
        scores: { [host.socketId]: 0, [guest.socketId]: 0 },
        answers: { [host.socketId]: [], [guest.socketId]: [] },
        completed: { [host.socketId]: false, [guest.socketId]: false }
      };

      await redis.setex(`gameroom:${gameId}`, 1800, JSON.stringify(roomState));
      await redis.setex(`socket:game:${host.socketId}`, 1800, gameId);
      await redis.setex(`socket:game:${guest.socketId}`, 1800, gameId);

      [host, guest].forEach((player) => {
        const opponent = player.socketId === host.socketId ? guest.userData : host.userData;
        io.to(player.socketId).emit('match-found', {
          gameId,
          opponent,
          subject: customRoom.subject,
          difficulty: customRoom.difficulty,
          classLevel: customRoom.classLevel,
          mode: 'custom-showdown',
          message: `Syllabus Showdown matched! Arena grounded in: ${customRoom.title}`
        });
      });

      await dispatchQuizJob({
        gameId,
        subject: customRoom.subject,
        difficulty: customRoom.difficulty,
        classLevel: customRoom.classLevel,
        documentId: customRoom.documentId,
        players: [host, guest]
      });
    });

    // ==========================================
    // 2. SUBMIT ANSWER (State in Redis)
    // ==========================================
    socket.on('submit-answer', async (data) => {
      if (!socket.userData) {
        socket.emit('auth-error', { message: 'Authentication required' });
        return;
      }

      const { gameId, questionIndex, answerIndex, timeLeft } = data;

      try {
        const rawGame = await redis.get(`gameroom:${gameId}`);
        if (!rawGame) {
          console.error(`❌ Game ${gameId} not found in Redis`);
          return;
        }

        const game = JSON.parse(rawGame);
        if (!game.questions || !game.questions[questionIndex]) return;

        const correctAnswer = game.questions[questionIndex].correctAnswer;
        const isCorrect = answerIndex !== -1 && answerIndex === correctAnswer;

        if (!game.answers[socket.id]) game.answers[socket.id] = [];
        game.answers[socket.id][questionIndex] = {
          answerIndex,
          timeLeft,
          isCorrect
        };

        if (isCorrect) {
          const basePoints = 10;
          const timeBonus = Math.floor(timeLeft / 3);
          const points = basePoints + timeBonus;
          game.scores[socket.id] = (game.scores[socket.id] || 0) + points;
        }

        // Save updated room state back to Redis
        await redis.setex(`gameroom:${gameId}`, 1800, JSON.stringify(game));

        const p1 = game.players[0];
        const p2 = game.players[1];

        const results = {
          questionIndex,
          correctAnswer,
          player1: {
            username: p1.userData.username,
            userId: p1.userData.userId,
            answer: game.answers[p1.socketId]?.[questionIndex]?.answerIndex ?? -1,
            isCorrect: game.answers[p1.socketId]?.[questionIndex]?.isCorrect ?? false,
            timeLeft: game.answers[p1.socketId]?.[questionIndex]?.timeLeft ?? 0,
            points: game.scores[p1.socketId] || 0,
            score: game.scores[p1.socketId] || 0,
            answers: game.answers[p1.socketId] || []
          },
          player2: {
            username: p2.userData.username,
            userId: p2.userData.userId,
            answer: game.answers[p2.socketId]?.[questionIndex]?.answerIndex ?? -1,
            isCorrect: game.answers[p2.socketId]?.[questionIndex]?.isCorrect ?? false,
            timeLeft: game.answers[p2.socketId]?.[questionIndex]?.timeLeft ?? 0,
            points: game.scores[p2.socketId] || 0,
            score: game.scores[p2.socketId] || 0,
            answers: game.answers[p2.socketId] || []
          }
        };

        game.players.forEach((player) => {
          io.to(player.socketId).emit('round-results', results);
        });
      } catch (err) {
        console.error('Error handling submit-answer in Redis:', err.message);
      }
    });

    // ==========================================
    // 3. GAME COMPLETE (Persist & Clean Redis)
    // ==========================================
    socket.on('game-complete', async (data) => {
      if (!socket.userData) {
        socket.emit('auth-error', { message: 'Authentication required' });
        return;
      }

      const { gameId } = data;

      try {
        const rawGame = await redis.get(`gameroom:${gameId}`);
        if (!rawGame) return;

        const game = JSON.parse(rawGame);
        game.completed[socket.id] = true;

        const bothCompleted = Object.values(game.completed).every(Boolean);

        if (bothCompleted) {
          game.status = 'completed';

          const p1 = game.players[0];
          const p2 = game.players[1];
          const s1 = game.scores[p1.socketId] || 0;
          const s2 = game.scores[p2.socketId] || 0;

          const finalScores = {
            player1: {
              username: p1.userData.username,
              userId: p1.userData.userId,
              score: s1,
              points: s1,
              answers: game.answers[p1.socketId] || []
            },
            player2: {
              username: p2.userData.username,
              userId: p2.userData.userId,
              score: s2,
              points: s2,
              answers: game.answers[p2.socketId] || []
            },
            winner: s1 > s2 ? p1.userData.username : s1 < s2 ? p2.userData.username : 'tie'
          };

          const finalPayload = {
            ...finalScores,
            questions: game.questions || []
          };

          game.players.forEach((player) => {
            io.to(player.socketId).emit('game-final-results', finalPayload);
          });

          // Sync points, badges, streak, and level to MongoDB and Redis Global Leaderboard (ZSET)
          (async () => {
            try {
              const [u1, u2] = await Promise.all([
                User.findById(p1.userData.userId),
                User.findById(p2.userData.userId)
              ]);

              const isU1Winner = finalScores.winner === p1.userData.username;
              const isU2Winner = finalScores.winner === p2.userData.username;

              if (u1) {
                u1.points = (u1.points || 0) + s1;
                u1.battleStats.totalMatches = (u1.battleStats.totalMatches || 0) + 1;
                if (isU1Winner) {
                  u1.battleStats.wins = (u1.battleStats.wins || 0) + 1;
                  u1.battleStats.winStreak = (u1.battleStats.winStreak || 0) + 1;
                  if (u1.battleStats.wins === 1) u1.awardBadge('FIRST_WIN');
                  if (u1.battleStats.winStreak >= 3) u1.awardBadge('HOT_STREAK_3');
                  if (u1.battleStats.winStreak >= 5) u1.awardBadge('ARENA_TITAN');
                } else if (isU2Winner) {
                  u1.battleStats.losses = (u1.battleStats.losses || 0) + 1;
                  u1.battleStats.winStreak = 0;
                }
                if (u1.points >= 500) u1.awardBadge('SCHOLAR_500');
                if (u1.points >= 1500) u1.awardBadge('GRANDMASTER_1500');
                u1.recordDailyActivity();
                await u1.save({ validateBeforeSave: false });

                // Multi-ZSET sync for player 1
                const keys1 = getLeaderboardKeys(u1.class);
                await redis.zadd(keys1.globalKey, u1.points, u1._id.toString());
                await redis.zincrby(keys1.weeklyKey, s1, u1._id.toString());
                redis.expire(keys1.weeklyKey, 8 * 24 * 3600).catch(() => {});
                if (keys1.classKey) await redis.zadd(keys1.classKey, u1.points, u1._id.toString());
              }

              if (u2) {
                u2.points = (u2.points || 0) + s2;
                u2.battleStats.totalMatches = (u2.battleStats.totalMatches || 0) + 1;
                if (isU2Winner) {
                  u2.battleStats.wins = (u2.battleStats.wins || 0) + 1;
                  u2.battleStats.winStreak = (u2.battleStats.winStreak || 0) + 1;
                  if (u2.battleStats.wins === 1) u2.awardBadge('FIRST_WIN');
                  if (u2.battleStats.winStreak >= 3) u2.awardBadge('HOT_STREAK_3');
                  if (u2.battleStats.winStreak >= 5) u2.awardBadge('ARENA_TITAN');
                } else if (isU1Winner) {
                  u2.battleStats.losses = (u2.battleStats.losses || 0) + 1;
                  u2.battleStats.winStreak = 0;
                }
                if (u2.points >= 500) u2.awardBadge('SCHOLAR_500');
                if (u2.points >= 1500) u2.awardBadge('GRANDMASTER_1500');
                u2.recordDailyActivity();
                await u2.save({ validateBeforeSave: false });

                // Multi-ZSET sync for player 2
                const keys2 = getLeaderboardKeys(u2.class);
                await redis.zadd(keys2.globalKey, u2.points, u2._id.toString());
                await redis.zincrby(keys2.weeklyKey, s2, u2._id.toString());
                redis.expire(keys2.weeklyKey, 8 * 24 * 3600).catch(() => {});
                if (keys2.classKey) await redis.zadd(keys2.classKey, u2.points, u2._id.toString());
              }

              console.log('🏆 Synced game scores, streaks, and badges with MongoDB & Multi-Tier Redis Leaderboards');

              // Emit enriched result events to each player with progression feedback
              io.to(p1.socketId).emit('player-progress-update', {
                levelStats: u1 ? u1.getLevelStats() : null,
                streak: u1?.streak,
                badges: u1?.badges
              });

              io.to(p2.socketId).emit('player-progress-update', {
                levelStats: u2 ? u2.getLevelStats() : null,
                streak: u2?.streak,
                badges: u2?.badges
              });
            } catch (dbErr) {
              console.error('Error persisting scores to DB/Redis:', dbErr.message);
            }
          })();

          // Cleanup Redis keys
          await redis.del(`gameroom:${gameId}`);
          await redis.del(`socket:game:${p1.socketId}`);
          await redis.del(`socket:game:${p2.socketId}`);
        } else {
          // Save completion status for player 1
          await redis.setex(`gameroom:${gameId}`, 1800, JSON.stringify(game));
        }
      } catch (err) {
        console.error('Error handling game-complete in Redis:', err.message);
      }
    });

    // ==========================================
    // 4. DISCONNECT (Clean Redis Queues)
    // ==========================================
    socket.on('disconnect', async () => {
      console.log('⚡ Socket disconnected:', socket.id);

      try {
        // Check if user was in a waiting lobby
        const userMapping = await redis.get(`socket:user:${socket.id}`);
        if (userMapping) {
          const { userId, roomKey } = JSON.parse(userMapping);
          const lobbyQueueKey = `lobby:queue:${roomKey}`;
          const lobbyUsersKey = `lobby:users:${roomKey}`;

          await redis.srem(lobbyUsersKey, userId);

          // Remove socket entry from Redis list
          const queued = await redis.lrange(lobbyQueueKey, 0, -1);
          for (const raw of queued) {
            const p = JSON.parse(raw);
            if (p.socketId === socket.id) {
              await redis.lrem(lobbyQueueKey, 0, raw);
              break;
            }
          }
          await redis.del(`socket:user:${socket.id}`);
        }

        // Check if user was in an active game
        const activeGameId = await redis.get(`socket:game:${socket.id}`);
        if (activeGameId) {
          const rawGame = await redis.get(`gameroom:${activeGameId}`);
          if (rawGame) {
            const game = JSON.parse(rawGame);
            const opponent = game.players.find((p) => p.socketId !== socket.id);
            if (opponent) {
              io.to(opponent.socketId).emit('opponent-disconnected');
            }
            await redis.del(`gameroom:${activeGameId}`);
          }
          await redis.del(`socket:game:${socket.id}`);
        }
      } catch (err) {
        console.error('Error cleaning up disconnected socket from Redis:', err.message);
      }
    });
  });
}
