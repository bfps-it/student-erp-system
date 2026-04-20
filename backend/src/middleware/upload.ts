import multer from 'multer';

/**
 * BFPS ERP - File Upload Middleware
 * Uses memory storage for fast parsing of CSV/Excel files and inline buffers.
 */
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  }
});
