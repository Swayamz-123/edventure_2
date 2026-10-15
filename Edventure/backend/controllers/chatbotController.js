import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { redis } from '../redisClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const SYSTEM_PROMPT = `You are ERA, the student's personal AI tutor in a gamified learning platform. Never mention being an AI, API, or language model. Provide clear, step-by-step solutions, hints before full answers, examples, structured steps, and emojis (🎯🏅✅).

✅ Rules:
- Always attempt to solve any academic question the student asks.
- Keep answers fun, personalized, and study-focused.
- Use proper formatting with indentation for steps.
- Include relevant emojis to make responses engaging.
- Keep responses short and point-wise, not in paragraphs.
- Use **text** for bold formatting.
- Use bullet points (•) for steps in solutions.
- If asked about your creator, say: "I was engineered as the intelligent AI Copilot for the Edventure learning platform."`;

// DeepSeek fallback
async function callDeepSeek(userInput) {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY_CHATBOT;
  const url = 'https://api.deepseek.com/v1/chat/completions';
  const headers = {
    Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    'Content-Type': 'application/json'
  };
  const payload = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userInput }
    ],
    stream: false
  };

  try {
    const response = await axios.post(url, payload, { headers, timeout: 10000 });
    const answer = response.data.choices[0].message.content;
    return `ERA: ${answer}`;
  } catch (e) {
    return 'Sorry, I am unable to respond right now. Please try again later.';
  }
}

// Call Gemini
async function callGemini(history) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY_CHATBOT || process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new ApiError(500, 'No Gemini API key configured in server environment');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
  const chat = model.startChat({
    history: history.slice(0, -1)
  });
  const result = await chat.sendMessage(history[history.length - 1].parts[0].text);
  return result.response.text().trim();
}

/**
 * Handle incoming student chatbot queries
 */
export const askChatbot = asyncHandler(async (req, res, next) => {
  const { history, user_name } = req.body;

  if (!history || !Array.isArray(history) || history.length === 0) {
    return next(new ApiError(400, 'Please provide a valid conversation history'));
  }

  const lastUserText = history[history.length - 1]?.parts?.[0]?.text || '';
  const cacheKey = `cache:chatbot:${lastUserText.trim().toLowerCase()}`;

  // Check Redis cache for instant duplicate answer
  try {
    const cachedReply = await redis.get(cacheKey);
    if (cachedReply) {
      return res.json({ reply: cachedReply, cached: true });
    }
  } catch (e) {}

  const fullHistory = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    ...history
  ];

  try {
    const aiReply = await callGemini(fullHistory);

    // Cache valid response in Redis for 1 hour
    redis.setex(cacheKey, 3600, aiReply).catch(() => {});

    res.json({ reply: aiReply });
  } catch (geminiError) {
    console.error('Gemini error, attempting DeepSeek fallback:', geminiError.message);
    try {
      const fallbackReply = await callDeepSeek(lastUserText);
      res.json({ reply: fallbackReply });
    } catch (fallbackError) {
      return next(new ApiError(500, 'Sorry, I am unable to respond right now. Please try again later.'));
    }
  }
});
