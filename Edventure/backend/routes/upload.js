import express from 'express';
import { upload } from '../middleware/multer.js';
import { uploadFile, removeFile } from '../controllers/uploadController.js';
import { verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// Upload a single file (PDF notes, study material, images) to Cloudinary
router.post('/', verifyJWT, upload.single('file'), uploadFile);

// Delete file from Cloudinary
router.delete('/', verifyJWT, removeFile);

export default router;
