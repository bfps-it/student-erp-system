const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

/**
 * BFPS ERP - General Utility Helpers
 */

/**
 * Generate a unique reference ID
 * @param {string} prefix - Prefix for the ID (e.g., 'LV', 'CA', 'CE', 'LD')
 * @returns {string} Formatted reference ID
 */
function generateReferenceId(prefix = 'REF') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a URL-safe slug
 * @param {string} text - Text to slugify
 * @returns {string} URL slug
 */
function createSlug(text) {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  });
}

/**
 * Calculate the number of days between two dates
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @returns {number} Number of days (inclusive)
 */
function calculateDays(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to - from);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Inclusive
}

/**
 * Format a date for display
 * @param {Date} date - Date to format
 * @param {string} locale - Locale (default: 'en-IN')
 * @returns {string} Formatted date string
 */
function formatDate(date, locale = 'en-IN') {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Sanitize XSS from string input
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return input;
  const xss = require('xss');
  return xss(input.trim());
}

/**
 * Paginate query results
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @returns {{ skip: number, take: number }}
 */
function paginate(page = 1, limit = 50) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

/**
 * Build pagination metadata for response
 * @param {number} total - Total records
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
function paginationMeta(total, page = 1, limit = 50) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const totalPages = Math.ceil(total / safeLimit);

  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}

/**
 * Get current academic year
 * @returns {string} Academic year (e.g., '2026-27')
 */
function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // Academic year starts in April (month 3)
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(2)}`;
  }
  return `${year - 1}-${String(year).slice(2)}`;
}

module.exports = {
  generateReferenceId,
  createSlug,
  calculateDays,
  formatDate,
  sanitizeInput,
  paginate,
  paginationMeta,
  getCurrentAcademicYear,
};
