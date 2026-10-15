import { GoogleGenerativeAI } from '@google/generative-ai';
import { redis } from '../redisClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import PracticeQuestion from '../models/PracticeQuestion.js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to generate AI questions with Redis Caching
export async function generateQuestions(subject, difficulty, classLevel) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
    throw new ApiError(500, 'GEMINI_API_KEY not configured properly in .env');
  }

  // Check Redis cache first (TTL: 24 hours)
  const cacheKey = `cache:questions:${subject}-${difficulty}-${classLevel}`.toLowerCase();
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`📋 [Redis Cache Hit] Using cached questions for ${cacheKey}`);
      return JSON.parse(cached);
    }
  } catch (redisErr) {}

  const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
  const seed = `${subject}-${difficulty}-${classLevel}`.toLowerCase();

  const prompt = `Generate 5 multiple choice questions for ${subject} at ${difficulty} difficulty level for class ${classLevel} students. 

Use this seed for consistency: "${seed}"

Return the response in this exact JSON format:
{
  "questions": [
    {
      "id": "unique_id_1",
      "subject": "${subject}",
      "class": ${classLevel},
      "difficulty": "${difficulty}",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "points": 10,
      "timeLimit": 30
    }
  ]
}

Requirements:
- Generate exactly 5 questions
- Each question must have 4 options (A, B, C, D)
- correctAnswer should be the index (0-3) of the correct option
- Make questions educational and appropriate for the class level
- Ensure questions are challenging but solvable
- Use proper JSON formatting
- Use the seed "${seed}" to ensure consistent generation`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text().trim();

  if (text.startsWith('```json')) {
    text = text.replace(/```json\s*/, '').replace(/```\s*$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/```\s*/, '').replace(/```\s*$/, '');
  }

  const questionsData = JSON.parse(text);
  const questions = questionsData.questions;

  // Cache in Redis for 24 hours
  redis.setex(cacheKey, 86400, JSON.stringify(questions)).catch(() => {});
  return questions;
}

// Get practice questions fallback
export const getBattlegroundsQuestionsLegacy = asyncHandler(async (req, res) => {
  const questions = await PracticeQuestion.find().limit(20).lean();
  res.json(questions);
});

// Filter & generate battlegrounds questions
export const filterQuestions = asyncHandler(async (req, res, next) => {
  const { subject, difficulty, class: classLevel, gameId } = req.query;

  if (!subject || !difficulty || !classLevel) {
    return next(new ApiError(400, 'Missing required parameters: subject, difficulty, class'));
  }

  // Check Redis for active game questions
  if (gameId) {
    try {
      const existingData = await redis.get(`game:${gameId}:questions`);
      if (existingData) {
        return res.json({ questions: JSON.parse(existingData) });
      }
    } catch (e) {}
  }

  const questions = await generateQuestions(subject, difficulty, parseInt(classLevel, 10));

  if (gameId) {
    await redis.setex(`game:${gameId}:questions`, 7200, JSON.stringify(questions));
  }

  res.json({ questions });
});

// Get stored questions for a game
export const getGameQuestions = asyncHandler(async (req, res, next) => {
  const { gameId } = req.params;
  const gameData = await redis.get(`game:${gameId}:questions`);

  if (!gameData) {
    return next(new ApiError(404, 'Game questions not found or expired'));
  }

  res.json({ questions: JSON.parse(gameData) });
});

// Save completed game questions to MongoDB PracticeQuestion collection
export const savePracticeQuestions = asyncHandler(async (req, res, next) => {
  const { gameId, subject, difficulty, classLevel, questions } = req.body;

  if (!gameId || !questions || !Array.isArray(questions)) {
    return next(new ApiError(400, 'Missing required parameters: gameId, questions'));
  }

  const formattedQuestions = questions.map((q) => ({
    gameId,
    subject: (subject || q.subject || 'general').toLowerCase(),
    difficulty: (difficulty || q.difficulty || 'medium').toLowerCase(),
    classLevel: parseInt(classLevel || q.class || q.classLevel || 10, 10),
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer ?? 0,
    points: q.points || 10,
    timeLimit: q.timeLimit || 30,
    savedBy: req.user?._id
  }));

  await PracticeQuestion.insertMany(formattedQuestions, { ordered: false });

  res.json(new ApiResponse(200, null, 'Questions saved for practice in database'));
});

// Get practice questions from AI or MongoDB
export const getPracticeQuestions = asyncHandler(async (req, res, next) => {
  const { subject, difficulty, class: classLevel, limit } = req.query;

  if (!subject || !difficulty || !classLevel) {
    return next(new ApiError(400, 'Missing required parameters: subject, difficulty, class'));
  }

  const limitNum = limit ? parseInt(limit, 10) : 10;

  try {
    const generated = await generateQuestions(subject, difficulty, parseInt(classLevel, 10));
    const selected = Array.isArray(generated) ? generated.slice(0, limitNum) : [];
    return res.json({ questions: selected });
  } catch (genError) {
    console.warn('AI question generation failed, reading from MongoDB PracticeQuestion collection');

    const storedQuestions = await PracticeQuestion.getRandomQuestions({
      subject,
      difficulty,
      classLevel,
      count: limitNum
    });
    return res.json({ questions: storedQuestions });
  }
});
