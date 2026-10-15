import mongoose from 'mongoose';

const practiceQuestionSchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      index: true
    },
    subject: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    topic: {
      type: String,
      trim: true,
      default: 'General'
    },
    difficulty: {
      type: String,
      required: true,
      lowercase: true,
      enum: ['easy', 'medium', 'hard'],
      index: true
    },
    classLevel: {
      type: Number,
      required: true,
      index: true
    },
    question: {
      type: String,
      required: true,
      trim: true
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length === 4,
        message: 'A question must have exactly 4 options'
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3
    },
    explanation: {
      type: String,
      trim: true,
      default: ''
    },
    points: {
      type: Number,
      default: 10
    },
    timeLimit: {
      type: Number,
      default: 30
    },
    source: {
      type: String,
      enum: ['ai-generated', 'teacher-curated', 'rag-extracted', 'battleground'],
      default: 'ai-generated'
    },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// High-speed compound indexes for filtered queries & matchmaking lookups
practiceQuestionSchema.index({ subject: 1, difficulty: 1, classLevel: 1 });
practiceQuestionSchema.index({ classLevel: 1, subject: 1 });

/**
 * Static method to retrieve randomized practice questions with fallback
 */
practiceQuestionSchema.statics.getRandomQuestions = async function ({
  subject,
  difficulty,
  classLevel,
  count = 5
}) {
  const match = {};
  if (subject) match.subject = subject.toLowerCase();
  if (difficulty) match.difficulty = difficulty.toLowerCase();
  if (classLevel) match.classLevel = parseInt(classLevel, 10);

  let questions = await this.aggregate([
    { $match: match },
    { $sample: { size: count } }
  ]);

  // Fallback: If no exact match (e.g., rare topic/difficulty), relax difficulty
  if (!questions || questions.length === 0) {
    const relaxedMatch = {};
    if (subject) relaxedMatch.subject = subject.toLowerCase();
    if (classLevel) relaxedMatch.classLevel = parseInt(classLevel, 10);
    questions = await this.aggregate([
      { $match: relaxedMatch },
      { $sample: { size: count } }
    ]);
  }

  // Final fallback: any questions
  if (!questions || questions.length === 0) {
    questions = await this.aggregate([{ $sample: { size: count } }]);
  }

  return questions;
};

export default mongoose.model('PracticeQuestion', practiceQuestionSchema);

