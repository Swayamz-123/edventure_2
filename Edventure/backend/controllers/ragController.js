import CourseDocument from '../models/CourseDocument.js';
import DocumentChunk from '../models/DocumentChunk.js';
import PracticeQuestion from '../models/PracticeQuestion.js';
import User from '../models/User.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import {
  extractTextAndPagesFromPDF,
  chunkDocumentPages,
  generateEmbedding,
  retrieveRelevantChunks,
  answerWithGrounding,
  generateQuizFromChunks
} from '../services/ragService.js';
import { redis } from '../redisClient.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Upload a course syllabus PDF, extract text, generate vector embeddings, and save to Cloudinary + MongoDB
 */
export const uploadCourseDocument = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError(400, 'Please attach a PDF file to upload'));
  }

  const { title, subject, classLevel, chapter = 'General' } = req.body;

  if (!title || !subject || !classLevel) {
    return next(new ApiError(400, 'Title, subject, and classLevel are required fields'));
  }

  console.log(`📄 [RAG] Processing upload for "${title}" (${subject}, Class ${classLevel})`);

  // 1. Upload raw PDF directly to Cloudinary
  const cloudinaryResult = await uploadOnCloudinary(
    req.file.buffer,
    req.file.originalname,
    'edventure_syllabus_docs',
    'auto'
  );

  // 2. Extract text and page numbers from PDF in memory
  const { totalPages, pages } = await extractTextAndPagesFromPDF(req.file.buffer);

  if (!pages || pages.length === 0) {
    return next(new ApiError(400, 'The uploaded PDF does not contain extractable text'));
  }

  // 3. Chunk text into overlapping semantic blocks
  const chunkData = chunkDocumentPages(pages, 600, 80);
  console.log(`✂️ [RAG] Document split into ${chunkData.length} chunks across ${totalPages} pages`);

  // 4. Create parent CourseDocument
  const courseDoc = await CourseDocument.create({
    title: title.trim(),
    subject: subject.toLowerCase().trim(),
    classLevel: parseInt(classLevel, 10),
    chapter: chapter.trim(),
    cloudinaryUrl: cloudinaryResult.secure_url,
    cloudinaryPublicId: cloudinaryResult.public_id,
    originalFileName: req.file.originalname,
    fileSize: req.file.size,
    totalPages,
    totalChunks: chunkData.length,
    uploadedBy: req.user?._id
  });

  // 5. Generate embeddings in controlled batches (5 at a time) to prevent Gemini API rate limits
  const chunkDocs = [];
  const batchSize = 5;

  for (let i = 0; i < chunkData.length; i += batchSize) {
    const batch = chunkData.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map((chunk) => generateEmbedding(chunk.text))
    );

    batch.forEach((chunk, index) => {
      chunkDocs.push({
        documentId: courseDoc._id,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        pageNumber: chunk.pageNumber,
        subject: courseDoc.subject,
        classLevel: courseDoc.classLevel,
        embedding: batchEmbeddings[index]
      });
    });
  }

  // Bulk insert chunks into MongoDB
  await DocumentChunk.insertMany(chunkDocs, { ordered: false });

  // Reward student with 50 XP for uploading study material
  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, { $inc: { points: 50 } });
  }

  console.log(`✅ [RAG] "${title}" indexed successfully with ${chunkDocs.length} vector embeddings!`);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        document: courseDoc,
        totalChunksIndexed: chunkDocs.length,
        xpAwarded: 50
      },
      'Syllabus document uploaded and indexed into knowledge base successfully'
    )
  );
});

/**
 * Ask the RAG Syllabus Copilot a question with semantic retrieval & source grounding
 */
export const askSyllabusCopilot = asyncHandler(async (req, res, next) => {
  const { question, subject, classLevel, documentId } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return next(new ApiError(400, 'A question is required'));
  }

  const cleanQuery = question.trim();

  // 1. Check Redis cache for identical questions
  const cacheKey = `cache:rag:ask:${documentId || subject || 'all'}:${classLevel || 'all'}:${cleanQuery.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`📋 [Redis Cache Hit] RAG Copilot response served for "${cleanQuery}"`);
      return res.json(new ApiResponse(200, JSON.parse(cached), 'Response retrieved from cache'));
    }
  } catch (redisErr) {}

  // 2. Retrieve top-K relevant chunks using vector similarity
  const relevantChunks = await retrieveRelevantChunks({
    query: cleanQuery,
    subject,
    classLevel,
    documentId,
    topK: 4
  });

  // 3. Generate grounded answer with page-level citations
  const result = await answerWithGrounding({
    query: cleanQuery,
    chunks: relevantChunks,
    subject,
    classLevel
  });

  const responsePayload = {
    question: cleanQuery,
    answer: result.answer,
    citations: result.citations,
    chunksRetrieved: relevantChunks.length
  };

  // Cache in Redis for 2 hours (7200 seconds)
  redis.setex(cacheKey, 7200, JSON.stringify(responsePayload)).catch(() => {});

  return res.json(
    new ApiResponse(200, responsePayload, 'Syllabus Copilot answered successfully')
  );
});

/**
 * Get all uploaded syllabus documents
 */
export const getCourseDocuments = asyncHandler(async (req, res) => {
  const { subject, classLevel } = req.query;

  const filter = {};
  if (subject) filter.subject = subject.toLowerCase().trim();
  if (classLevel) filter.classLevel = parseInt(classLevel, 10);

  const documents = await CourseDocument.find(filter)
    .populate('uploadedBy', 'name username')
    .sort({ createdAt: -1 })
    .lean();

  return res.json(
    new ApiResponse(200, { documents }, 'Course documents retrieved successfully')
  );
});

/**
 * Get a single document details with chunk sample
 */
export const getCourseDocumentById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const doc = await CourseDocument.findById(id).populate('uploadedBy', 'name username').lean();
  if (!doc) {
    return next(new ApiError(404, 'Course document not found'));
  }

  const sampleChunks = await DocumentChunk.find({ documentId: id })
    .select('chunkIndex text pageNumber')
    .limit(5)
    .lean();

  return res.json(
    new ApiResponse(200, { document: doc, sampleChunks }, 'Document details retrieved')
  );
});

/**
 * Generate a 5-question multiple choice quiz directly grounded in an uploaded document
 */
export const generateDocumentQuiz = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const doc = await CourseDocument.findById(id).lean();
  if (!doc) {
    return next(new ApiError(404, 'Course document not found'));
  }

  const chunks = await DocumentChunk.find({ documentId: id }).limit(10).lean();
  if (!chunks || chunks.length === 0) {
    return next(new ApiError(400, 'No text passages available in this document'));
  }

  console.log(`🧠 [RAG] Generating practice quiz grounded in "${doc.title}"...`);
  const rawQuestions = await generateQuizFromChunks({
    chunks,
    subject: doc.subject,
    classLevel: doc.classLevel,
    documentTitle: doc.title
  });

  // Save to PracticeQuestion collection for reuse and solo practice
  const formattedQuestions = rawQuestions.map((q) => ({
    subject: doc.subject,
    topic: doc.chapter || doc.title,
    difficulty: q.difficulty || 'medium',
    classLevel: doc.classLevel,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer ?? 0,
    explanation: q.explanation || `Grounded in ${doc.title}`,
    points: q.points || 10,
    timeLimit: 30,
    source: 'rag-extracted',
    savedBy: req.user?._id
  }));

  const savedQuestions = await PracticeQuestion.insertMany(formattedQuestions);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        documentTitle: doc.title,
        questions: savedQuestions
      },
      'Grounded syllabus practice quiz generated and saved successfully'
    )
  );
});
