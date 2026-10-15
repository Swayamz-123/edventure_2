import express from 'express';
import { upload } from '../middleware/multer.js';
import { verifyJWT } from '../middleware/authMiddleware.js';
import {
  uploadCourseDocument,
  askSyllabusCopilot,
  getCourseDocuments,
  getCourseDocumentById,
  generateDocumentQuiz
} from '../controllers/ragController.js';

const router = express.Router();

// Upload syllabus PDF to Cloudinary + vector chunking
router.post('/upload', verifyJWT, upload.single('file'), uploadCourseDocument);

// Ask Syllabus Copilot question (Grounded RAG retrieval)
router.post('/ask', verifyJWT, askSyllabusCopilot);

// Browse uploaded course documents
router.get('/documents', verifyJWT, getCourseDocuments);
router.get('/documents/:id', verifyJWT, getCourseDocumentById);

// Generate grounded quiz from document
router.post('/documents/:id/quiz', verifyJWT, generateDocumentQuiz);

export default router;
