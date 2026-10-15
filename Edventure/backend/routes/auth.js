import express from 'express';
import { authLimiter } from '../middleware/rateLimiter.js';
import { verifyJWT } from '../middleware/authMiddleware.js';
import {
  initiateGoogleAuth,
  handleGoogleCallback,
  getCurrentUser,
  updateProfile,
  updatePoints,
  getLeaderboard,
  register,
  login,
  logout,
  refreshAccessToken,
  unlockCourse,
  updateAvatar
} from '../controllers/authController.js';

const router = express.Router();

// Google OAuth 2.0 (Direct JWT Login - No Passport needed)
router.get('/google', initiateGoogleAuth);
router.get('/google/callback', handleGoogleCallback);

// Public Authentication Routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh-token', refreshAccessToken);
router.get('/leaderboard', getLeaderboard);

// Protected Routes (Require Valid JWT Access Token)
router.get('/current_user', verifyJWT, getCurrentUser);
router.get('/current-user', verifyJWT, getCurrentUser);
router.get('/me', verifyJWT, getCurrentUser);

router.post('/logout', verifyJWT, logout);
router.get('/logout', verifyJWT, logout);

router.post('/update_profile', verifyJWT, updateProfile);
router.put('/update-profile', verifyJWT, updateProfile);

router.post('/update_points', verifyJWT, updatePoints);
router.post('/update-points', verifyJWT, updatePoints);

router.post('/unlock-course', verifyJWT, unlockCourse);
router.post('/update-avatar', verifyJWT, updateAvatar);
router.put('/update-avatar', verifyJWT, updateAvatar);

export default router;
