import mongoose from 'mongoose';

const documentChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CourseDocument',
      required: true,
      index: true
    },
    chunkIndex: {
      type: Number,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    pageNumber: {
      type: Number,
      default: 1
    },
    subject: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    classLevel: {
      type: Number,
      required: true,
      index: true
    },
    embedding: {
      type: [Number],
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast candidate pre-filtering before cosine similarity calculation
documentChunkSchema.index({ subject: 1, classLevel: 1 });
documentChunkSchema.index({ documentId: 1, chunkIndex: 1 });

export default mongoose.model('DocumentChunk', documentChunkSchema);
