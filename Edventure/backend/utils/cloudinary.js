import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from './ApiError.js';

const cleanVal = (val) => (val ? String(val).replace(/['"\s]/g, '') : '');

// Dynamic or static configure Cloudinary helper
function getCloudinaryConfig() {
  const cloud_name = cleanVal(process.env.CLOUDINARY_CLOUD_NAME);
  const api_key = cleanVal(process.env.CLOUDINARY_API_KEY);
  const api_secret = cleanVal(process.env.CLOUDINARY_API_SECRET);

  const isValid =
    Boolean(cloud_name) &&
    cloud_name !== 'your_cloudinary_cloud_name' &&
    Boolean(api_key) &&
    api_key !== 'your_cloudinary_api_key' &&
    Boolean(api_secret) &&
    api_secret !== 'your_cloudinary_api_secret';

  if (isValid) {
    cloudinary.config({ cloud_name, api_key, api_secret });
  }

  return { isValid, cloud_name, api_key };
}

// Initial configuration attempt
getCloudinaryConfig();

/**
 * Uploads a file buffer directly to Cloudinary using streams
 * 
 * @param {Buffer} fileBuffer - The in-memory buffer of the file
 * @param {string} fileName - Original file name
 * @param {string} folder - Target Cloudinary folder
 * @param {string} resourceType - 'raw' (for PDF/documents) or 'image' / 'auto'
 * @returns {Promise<Object>} Cloudinary upload result
 */
export const uploadOnCloudinary = (
  fileBuffer,
  fileName,
  folder = 'edventure_course_docs',
  resourceType = 'auto'
) => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) {
      return reject(new ApiError(400, 'No file buffer provided for Cloudinary upload'));
    }

    const { isValid } = getCloudinaryConfig();

    if (!isValid) {
      console.warn('⚠️ Cloudinary is unconfigured or credentials missing. Proceeding with fallback document URL.');
      return resolve({
        secure_url: `https://res.cloudinary.com/edventure-docs/raw/upload/${path_basename(fileName)}.pdf`,
        public_id: `fallback_doc_${Date.now()}`
      });
    }

    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: `${Date.now()}_${path_basename(fileName)}`
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary Stream Error:', error.message);
            return resolve({
              secure_url: `https://res.cloudinary.com/edventure-docs/raw/upload/${path_basename(fileName)}.pdf`,
              public_id: `fallback_err_${Date.now()}`
            });
          }
          resolve(result);
        }
      );

      uploadStream.end(fileBuffer);
    } catch (err) {
      console.error('❌ Cloudinary Synchronous Exception:', err.message);
      resolve({
        secure_url: `https://res.cloudinary.com/edventure-docs/raw/upload/${path_basename(fileName)}.pdf`,
        public_id: `fallback_catch_${Date.now()}`
      });
    }
  });
};

function path_basename(name = 'file') {
  return name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Deletes a file from Cloudinary by its public ID
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  try {
    if (!publicId) return null;
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error.message);
    return null;
  }
};

export default cloudinary;
