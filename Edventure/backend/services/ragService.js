import { PDFParse } from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import DocumentChunk from '../models/DocumentChunk.js';
import { ApiError } from '../utils/ApiError.js';

const getGenAI = () => {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'your_gemini_api_key') {
    throw new ApiError(500, 'GEMINI_API_KEY is not configured in .env');
  }
  return new GoogleGenerativeAI(key);
};

/**
 * Extracts raw text and per-page content from an in-memory PDF buffer
 * 
 * @param {Buffer} buffer - In-memory PDF file buffer
 * @returns {Promise<{ totalPages: number, pages: Array<{ pageNumber: number, text: string }> }>}
 */
export async function extractTextAndPagesFromPDF(buffer) {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    const pages = (result.pages || [])
      .map((p) => ({
        pageNumber: p.num,
        text: p.text ? p.text.replace(/\s+/g, ' ').trim() : ''
      }))
      .filter((p) => p.text.length > 20); // Filter out blank or negligible pages

    return {
      totalPages: result.total || pages.length,
      pages
    };
  } catch (err) {
    console.error('❌ Error parsing PDF buffer:', err.message);
    throw new ApiError(400, `Failed to extract text from PDF: ${err.message}`);
  }
}

/**
 * Splits document pages into overlapping semantic chunks
 * 
 * @param {Array<{ pageNumber: number, text: string }>} pages 
 * @param {number} chunkSize - Target characters per chunk
 * @param {number} overlap - Overlapping characters between consecutive chunks
 * @returns {Array<{ chunkIndex: number, text: string, pageNumber: number }>}
 */
export function chunkDocumentPages(pages, chunkSize = 600, overlap = 80) {
  const chunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const pageText = page.text;
    if (pageText.length <= chunkSize) {
      chunks.push({
        chunkIndex: chunkIndex++,
        text: pageText,
        pageNumber: page.pageNumber
      });
      continue;
    }

    let start = 0;
    while (start < pageText.length) {
      let end = start + chunkSize;
      if (end < pageText.length) {
        // Break cleanly at the nearest space or punctuation mark
        const spaceIdx = pageText.lastIndexOf(' ', end);
        if (spaceIdx > start + chunkSize * 0.7) {
          end = spaceIdx;
        }
      }

      const chunkText = pageText.substring(start, end).trim();
      if (chunkText.length > 30) {
        chunks.push({
          chunkIndex: chunkIndex++,
          text: chunkText,
          pageNumber: page.pageNumber
        });
      }

      start = end - overlap;
    }
  }

  return chunks;
}

/**
 * Generates high-dimensional vector embeddings using Google text-embedding-004 (768 dims)
 * 
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
    throw new ApiError(500, 'GEMINI_API_KEY is not configured in .env');
  }

  const model = getGenAI().getGenerativeModel({ model: 'gemini-embedding-2' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Computes cosine similarity between two numerical vectors
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieves the Top-K most relevant syllabus chunks using vector semantic search
 * 
 * @param {Object} params
 * @param {string} params.query - Student's question
 * @param {string} [params.subject] - Subject filter
 * @param {number} [params.classLevel] - Class level filter
 * @param {string} [params.documentId] - Optional specific document ID
 * @param {number} [params.topK=4] - Number of top chunks to retrieve
 */
export async function retrieveRelevantChunks({ query, subject, classLevel, documentId, topK = 4 }) {
  // 1. Generate embedding for student's search query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Pre-filter candidate chunks in MongoDB using compound indexes
  const filter = {};
  if (documentId) {
    filter.documentId = documentId;
  } else {
    if (subject) filter.subject = subject.toLowerCase().trim();
    if (classLevel) filter.classLevel = parseInt(classLevel, 10);
  }

  // Retrieve candidates (limit to 100 candidate chunks to keep cosine calculation under 5ms)
  const candidates = await DocumentChunk.find(filter)
    .populate('documentId', 'title chapter originalFileName')
    .limit(100)
    .lean();

  if (!candidates || candidates.length === 0) {
    return [];
  }

  // 3. Score candidate chunks using Cosine Similarity
  const scoredChunks = candidates.map((chunk) => {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      chunkId: chunk._id,
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      documentTitle: chunk.documentId?.title || 'Course Material',
      chapter: chunk.documentId?.chapter || 'General',
      similarity
    };
  });

  // 4. Sort by highest similarity and pick Top-K
  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  // Only keep chunks with positive similarity threshold
  return scoredChunks.slice(0, topK).filter((c) => c.similarity >= 0.35);
}

/**
 * Generates a strictly grounded, cited answer using Gemini 2.0 Flash
 */
export async function answerWithGrounding({ query, chunks, subject, classLevel }) {
  if (!chunks || chunks.length === 0) {
    return {
      answer: "I couldn't find any relevant sections in the uploaded course notes for this question. Please upload notes covering this topic or ask a question directly related to your syllabus.",
      citations: []
    };
  }

  // Format retrieved context chunks with page numbers and document labels
  const contextText = chunks
    .map(
      (c, idx) =>
        `[Excerpt ${idx + 1} | Document: "${c.documentTitle}" | Page: ${c.pageNumber} | Relevance: ${(c.similarity * 100).toFixed(1)}%]\n"${c.text}"`
    )
    .join('\n\n');

  const systemPrompt = `You are the Edventure AI Syllabus Copilot, an expert academic tutor for Class ${classLevel || 10} ${subject || 'general'} students.

Your task is to answer the student's question accurately using ONLY the course excerpts provided below.

Strict Grounding Rules:
1. Ground every claim directly in the excerpts.
2. At the end of key sentences or claims, cite the excerpt and page number like: [Page X].
3. If the answer cannot be found or deduced from the excerpts, explicitly say: "This topic is not covered in your uploaded syllabus notes." Do NOT hallucinate outside facts.
4. Keep the explanation engaging, concise, and structured with bullet points where appropriate.

Course Excerpts:
${contextText}

Student Question:
${query}`;

  const model = getGenAI().getGenerativeModel({ model: 'gemini-3.8-flash' });
  const result = await model.generateContent(systemPrompt);
  const response = await result.response;
  const answerText = response.text().trim();

  // Extract unique citations
  const citations = chunks.map((c) => ({
    documentTitle: c.documentTitle,
    chapter: c.chapter,
    pageNumber: c.pageNumber,
    relevanceScore: parseFloat((c.similarity * 100).toFixed(1))
  }));

  return {
    answer: answerText,
    citations
  };
}

/**
 * Generates 5 multiple choice questions grounded strictly in an uploaded course document
 */
export async function generateQuizFromChunks({ chunks, subject, classLevel, documentTitle }) {
  if (!chunks || chunks.length === 0) {
    throw new ApiError(400, 'Cannot generate quiz: No text chunks found in document');
  }

  // Sample top text passages from the document
  const sampleContext = chunks
    .slice(0, 8)
    .map((c) => c.text)
    .join('\n\n')
    .slice(0, 4000);

  const prompt = `You are an expert exam question creator for Class ${classLevel || 10} ${subject || 'General'}.
Based STRICTLY on the course material provided below from "${documentTitle}", generate exactly 5 multiple choice practice questions.

Course Material:
${sampleContext}

Return the response in this exact JSON format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation of why this is the correct answer according to the text.",
      "difficulty": "medium",
      "points": 10
    }
  ]
}

Rules:
- Generate exactly 5 questions
- Exactly 4 options per question
- correctAnswer must be index 0, 1, 2, or 3
- Make questions educational and directly tested on the text
- Only return valid JSON`;

  const model = getGenAI().getGenerativeModel({ model: 'gemini-3.8-flash' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text().trim();

  if (text.startsWith('```json')) {
    text = text.replace(/```json\s*/, '').replace(/```\s*$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/```\s*/, '').replace(/```\s*$/, '');
  }

  const parsed = JSON.parse(text);
  return parsed.questions || [];
}
