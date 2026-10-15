import PracticeQuestion from '../models/PracticeQuestion.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Get practice questions with filtering & pagination
 */
export const getPracticeQuestionsList = asyncHandler(async (req, res) => {
  const { subject, difficulty, classLevel, topic, page = 1, limit = 10 } = req.query;

  const query = {};
  if (subject) query.subject = subject.toLowerCase().trim();
  if (difficulty) query.difficulty = difficulty.toLowerCase().trim();
  if (classLevel) query.classLevel = parseInt(classLevel, 10);
  if (topic) query.topic = { $regex: topic.trim(), $options: 'i' };

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [questions, total] = await Promise.all([
    PracticeQuestion.find(query).skip(skip).limit(limitNum).sort({ createdAt: -1 }).lean(),
    PracticeQuestion.countDocuments(query)
  ]);

  return res.json(
    new ApiResponse(
      200,
      {
        questions,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      },
      'Practice questions retrieved successfully'
    )
  );
});

/**
 * Get randomized practice questions for instant quiz mode
 */
export const getRandomPracticeQuiz = asyncHandler(async (req, res, next) => {
  const { subject, difficulty, classLevel, count = 5 } = req.query;

  if (!subject) {
    return next(new ApiError(400, 'Subject is required for practice quiz'));
  }

  const questions = await PracticeQuestion.getRandomQuestions({
    subject,
    difficulty,
    classLevel,
    count: Math.min(20, Math.max(1, parseInt(count, 10)))
  });

  return res.json(
    new ApiResponse(200, { questions }, 'Randomized practice quiz generated successfully')
  );
});

/**
 * Get a single practice question by ID
 */
export const getPracticeQuestionById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const question = await PracticeQuestion.findById(id).lean();
  if (!question) {
    return next(new ApiError(404, 'Practice question not found'));
  }

  return res.json(
    new ApiResponse(200, { question }, 'Practice question retrieved successfully')
  );
});

/**
 * Create a new curated practice question
 */
export const createPracticeQuestion = asyncHandler(async (req, res, next) => {
  const { subject, topic, difficulty, classLevel, question, options, correctAnswer, explanation, points, timeLimit } = req.body;

  if (!subject || !difficulty || !classLevel || !question || !options || correctAnswer === undefined) {
    return next(new ApiError(400, 'Missing required question fields'));
  }

  if (!Array.isArray(options) || options.length !== 4) {
    return next(new ApiError(400, 'Options must be an array of exactly 4 choices'));
  }

  const newQuestion = await PracticeQuestion.create({
    subject: subject.toLowerCase().trim(),
    topic: topic || 'General',
    difficulty: difficulty.toLowerCase().trim(),
    classLevel: parseInt(classLevel, 10),
    question: question.trim(),
    options,
    correctAnswer: parseInt(correctAnswer, 10),
    explanation: explanation || '',
    points: points || 10,
    timeLimit: timeLimit || 30,
    source: 'teacher-curated',
    savedBy: req.user?._id
  });

  return res.status(201).json(
    new ApiResponse(201, { question: newQuestion }, 'Practice question created successfully')
  );
});

/**
 * Record a mistake into the student's personal Mistake Notebook
 */
export const recordUserMistake = asyncHandler(async (req, res, next) => {
  const { questionId, questionText, subject, selectedOption, correctOption, explanation } = req.body;

  if (!questionText || selectedOption === undefined || correctOption === undefined) {
    return next(new ApiError(400, 'Missing questionText, selectedOption, or correctOption'));
  }

  const User = (await import('../models/User.js')).default;
  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new ApiError(404, 'User not found'));
  }

  user.recordMistake({
    questionId,
    questionText,
    subject: subject || 'General',
    selectedOption: parseInt(selectedOption, 10),
    correctOption: parseInt(correctOption, 10),
    explanation: explanation || ''
  });

  await user.save({ validateBeforeSave: false });

  return res.status(201).json(
    new ApiResponse(201, { mistakesCount: user.mistakes.length }, 'Mistake saved to notebook')
  );
});

/**
 * Get student's personal Mistake Notebook
 */
export const getUserMistakes = asyncHandler(async (req, res) => {
  const User = (await import('../models/User.js')).default;
  const user = await User.findById(req.user._id).select('mistakes').lean();

  return res.json(
    new ApiResponse(200, { mistakes: user?.mistakes || [] }, 'Mistakes retrieved successfully')
  );
});

/**
 * Get a targeted 5-question retry quiz from past mistakes (Spaced Repetition)
 */
export const getMistakesPracticeQuiz = asyncHandler(async (req, res) => {
  const User = (await import('../models/User.js')).default;
  const user = await User.findById(req.user._id).select('mistakes').lean();

  const mistakes = user?.mistakes || [];
  if (mistakes.length === 0) {
    return res.json(
      new ApiResponse(200, { questions: [] }, 'No recorded mistakes found! Keep up the good work!')
    );
  }

  // Shuffle and pick up to 5 mistakes
  const shuffled = [...mistakes].sort(() => 0.5 - Math.random()).slice(0, 5);

  return res.json(
    new ApiResponse(200, { questions: shuffled }, 'Mistake review quiz generated')
  );
});

/**
 * AI Explainer: Explains the student's conceptual misunderstanding in 2 sentences
 */
export const explainMistakeWithAI = asyncHandler(async (req, res, next) => {
  const { questionText, selectedOptionText, correctOptionText, subject } = req.body;

  if (!questionText || !selectedOptionText || !correctOptionText) {
    return next(new ApiError(400, 'questionText, selectedOptionText, and correctOptionText are required'));
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

  const prompt = `You are a supportive, expert school tutor for ${subject || 'general'} students.
A student made a mistake on this question:
Question: "${questionText}"
Student chose: "${selectedOptionText}"
Correct answer is: "${correctOptionText}"

In 2 clear, encouraging sentences:
1. Explain WHY the student's chosen option is a common misconception.
2. Provide a simple mental rule or formula so they remember the correct answer next time.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const explanation = response.text().trim();

  return res.json(
    new ApiResponse(200, { explanation }, 'AI misconception analysis generated')
  );
});
