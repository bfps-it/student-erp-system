import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

import logger from '../utils/logger';
import type { CloudinaryUploadResult, CloudinaryUploadOptions } from '../types';

/**
 * BFPS ERP - Cloudinary Configuration (TypeScript)
 * File storage for: photos, resumes, documents, gallery images.
 */

function configureCloudinary(): void {
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
 */
async function uploadFile(
  filePath: string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const defaultOptions = {
    folder: 'bfps-erp',
    resource_type: 'auto' as const,
    quality: 'auto',
    ...options,
  };

  try {
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, defaultOptions);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Cloudinary upload error: ${message}`);
    throw error;
  }
}

/**
 * Delete file from Cloudinary
 */
async function deleteFile(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.debug(`Cloudinary file deleted: ${publicId}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Cloudinary delete error: ${message}`);
    throw error;
  }
}

export { configureCloudinary, uploadFile, deleteFile };
