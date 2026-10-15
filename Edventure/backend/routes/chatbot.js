import express from 'express';
import { chatbotLimiter } from '../middleware/rateLimiter.js';
import { askChatbot } from '../controllers/chatbotController.js';

const router = express.Router();

// Chatbot endpoint with Redis distributed sliding-window rate limiting
router.post('/', chatbotLimiter, askChatbot);

export default router;
