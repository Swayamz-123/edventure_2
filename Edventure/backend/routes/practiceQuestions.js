import express from 'express';
import {
  getPracticeQuestionsList,
  getRandomPracticeQuiz,
  getPracticeQuestionById,
  createPracticeQuestion,
  recordUserMistake,
  getUserMistakes,
  getMistakesPracticeQuiz,
  explainMistakeWithAI
} from '../controllers/practiceQuestionController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes for practice mode
router.get('/', getPracticeQuestionsList);
router.get('/random', getRandomPracticeQuiz);

// AI Mistake Notebook (Spaced Repetition)
router.post('/mistakes/record', verifyJWT, recordUserMistake);
router.get('/mistakes/list', verifyJWT, getUserMistakes);
router.get('/mistakes/quiz', verifyJWT, getMistakesPracticeQuiz);
router.post('/mistakes/explain', verifyJWT, explainMistakeWithAI);

// Get single question by ID
router.get('/:id', getPracticeQuestionById);

// Protected route to curate/add questions
router.post('/', verifyJWT, createPracticeQuestion);

export default router;

