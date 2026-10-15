import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Upload any course material, syllabus PDF, or avatar image to Cloudinary
 */
export const uploadFile = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ApiError(400, 'Please attach a file to upload'));
  }

  const { folder = 'edventure_uploads' } = req.body;
  const isPdf = req.file.mimetype === 'application/pdf';
  const resourceType = isPdf ? 'auto' : 'image';

  const result = await uploadOnCloudinary(
    req.file.buffer,
    req.file.originalname,
    folder,
    resourceType
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
        originalName: req.file.originalname
      },
      'File uploaded to Cloudinary successfully'
    )
  );
});

/**
 * Delete a file from Cloudinary by public ID
 */
export const removeFile = asyncHandler(async (req, res, next) => {
  const { publicId, resourceType = 'raw' } = req.body;

  if (!publicId) {
    return next(new ApiError(400, 'Public ID is required to delete a file'));
  }

  // Authorization check: Verify user owns the document associated with this asset (unless admin)
  if (req.user?.role !== 'admin') {
    const CourseDocument = (await import('../models/CourseDocument.js')).default;
    const doc = await CourseDocument.findOne({ cloudinaryPublicId: publicId });
    if (doc && doc.uploadedBy && doc.uploadedBy.toString() !== req.user._id.toString()) {
      return next(new ApiError(403, 'Forbidden: You do not own the file associated with this public ID'));
    }
  }

  const result = await deleteFromCloudinary(publicId, resourceType);

  return res.json(
    new ApiResponse(200, result, 'File removed from Cloudinary')
  );
});
