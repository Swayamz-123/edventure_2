import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import battlegroundsRoutes from './routes/battlegrounds.js';
import practiceQuestionsRoutes from './routes/practiceQuestions.js';
import uploadRoutes from './routes/upload.js';
import friendsRoutes from './routes/friends.js';
import chatbotRoutes from './routes/chatbot.js';
import ragRoutes from './routes/rag.js';
import shopRoutes from './routes/shop.js';
import adminRoutes from './routes/admin.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { ApiError } from './utils/ApiError.js';

const app = express();

// CORS configuration for local and production frontends
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:3000'
      ].filter(Boolean);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

// Body and Cookie parsers
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());

// API Routes
app.use('/auth', authRoutes);
app.use('/api', battlegroundsRoutes);
app.use('/api/practice-questions', practiceQuestionsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/admin', adminRoutes);

// Health check / welcome endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Edventure API',
    auth: 'JWT (Access + Refresh Tokens)',
    version: '2.0.0',
    redis: 'connected'
  });
});

// Catch unhandled routes (Express 5 compatible)
app.use((req, res, next) => {
  next(new ApiError(404, `Cannot find endpoint ${req.originalUrl} on this server`));
});

// Centralized error handling middleware
app.use(errorMiddleware);

export default app;
