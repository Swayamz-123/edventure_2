import 'dotenv/config';

import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import mongoose from 'mongoose';
import app from './app.js';
import connectDB from './db/index.js';
import { redis, pubClient, subClient } from './redisClient.js';
import registerGameHandlers from './gameRooms.js';
import { generateQuestions } from './controllers/battlegroundsController.js';
import User from './models/User.js';
import { initQuizWorker } from './queues/quizWorker.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server wrapping Express app
const server = createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Attach Redis Adapter for horizontal scaling across multiple Node instances
try {
  io.adapter(createAdapter(pubClient, subClient));
  console.log('🔌 Socket.io Redis Adapter initialized successfully');
} catch (adapterErr) {
  console.warn('⚠️ Could not attach Redis Adapter to Socket.io:', adapterErr.message);
}

// Register Battlegrounds multiplayer game handlers
registerGameHandlers(io, generateQuestions, User, redis);

// Initialize BullMQ worker for asynchronous background question generation
initQuizWorker(io);

// Connect to MongoDB
connectDB();

// Start HTTP & WebSocket Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Edventure Server running on port ${PORT}`);
});

// Graceful Shutdown handler
const gracefulShutdown = async () => {
  console.log('🛑 Shutting down gracefully...');
  server.close(async () => {
    try {
      await mongoose.connection.close();
      await redis.quit();
      await pubClient.quit();
      await subClient.quit();
      console.log('🔒 Connections closed cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
