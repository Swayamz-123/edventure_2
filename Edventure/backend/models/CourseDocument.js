import mongoose from 'mongoose';

const courseDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
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
    chapter: {
      type: String,
      trim: true,
      default: 'General'
    },
    cloudinaryUrl: {
      type: String,
      required: true
    },
    cloudinaryPublicId: {
      type: String,
      required: true
    },
    originalFileName: {
      type: String
    },
    fileSize: {
      type: Number
    },
    totalPages: {
      type: Number,
      default: 1
    },
    totalChunks: {
      type: Number,
      default: 0
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

courseDocumentSchema.index({ subject: 1, classLevel: 1 });

export default mongoose.model('CourseDocument', courseDocumentSchema);
