import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

// In-memory buffer storage: Stream directly to Cloudinary without writing temp files to disk
const storage = multer.memoryStorage();

// File filter: Allow PDFs and image notes (png, jpg, jpeg)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Unsupported file type: ${file.mimetype}. Only PDFs and Images (PNG, JPG, WebP) are allowed.`
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB max file size limit
  },
  fileFilter
});
