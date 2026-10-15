import express from 'express';
import { aiQuestionLimiter } from '../middleware/rateLimiter.js';
import {
  generateQuestions,
  getBattlegroundsQuestionsLegacy,
  filterQuestions,
  getGameQuestions,
  savePracticeQuestions,
  getPracticeQuestions
} from '../controllers/battlegroundsController.js';

const router = express.Router();

// Routes
router.get('/battlegrounds-questions', getBattlegroundsQuestionsLegacy);
router.get('/battlegrounds-questions/filter', aiQuestionLimiter, filterQuestions);
router.get('/battlegrounds-questions/game/:gameId', getGameQuestions);
router.post('/battlegrounds-questions/save-practice', savePracticeQuestions);
router.get('/battlegrounds-questions/practice', aiQuestionLimiter, getPracticeQuestions);

export { generateQuestions };
export default router;
