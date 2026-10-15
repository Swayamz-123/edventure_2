import express from 'express';
import { verifyJWT } from '../middleware/authMiddleware.js';
import {
  searchFriends,
  getFriends,
  addFriend,
  removeFriend
} from '../controllers/friendsController.js';

const router = express.Router();

// All friends endpoints require authenticated JWT
router.use(verifyJWT);

router.get('/search', searchFriends);
router.get('/', getFriends);
router.post('/add/:friendId', addFriend);
router.delete('/remove/:friendId', removeFriend);

export default router;
