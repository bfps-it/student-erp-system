const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

/**
 * BFPS ERP - Cloudinary Configuration
 * File storage for: photos, resumes, documents, gallery images.
 */

function configureCloudinary() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    logger.warn('Cloudinary credentials not set. File upload features will be disabled.');
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  logger.info('Cloudinary configured successfully');
}

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Local file path or base64 string
 * @param {object} options - Upload options
 * @returns {object} Cloudinary upload result
 */
async function uploadFile(filePath, options = {}) {
  const defaultOptions = {
    folder: 'bfps-erp',
    resource_type: 'auto',
    quality: 'auto',
    ...options,
  };

  try {
    const result = await cloudinary.uploader.upload(filePath, defaultOptions);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
    };
  } catch (error) {
    logger.error(`Cloudinary upload error: ${error.message}`);
    throw error;
  }
}

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 */
async function deleteFile(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.debug(`Cloudinary file deleted: ${publicId}`);
  } catch (error) {
    logger.error(`Cloudinary delete error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  configureCloudinary,
  uploadFile,
  deleteFile,
};
