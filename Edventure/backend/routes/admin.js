import express from 'express';
import { getSystemMetrics } from '../controllers/adminController.js';
import { verifyJWT, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// System health & queue throughput dashboard - Strictly for Admin Role
router.get('/metrics', verifyJWT, authorizeRoles('admin'), getSystemMetrics);

export default router;
