import slugify from 'slugify';
import xss from 'xss';

import type { PaginationMeta } from '../types';

/**
 * BFPS ERP - General Utility Helpers (TypeScript)
 */

/**
 * Generate a unique reference ID
 * @param prefix - Prefix for the ID (e.g., 'LV', 'CA', 'CE', 'LD')
 * @returns Formatted reference ID
 */
export function generateReferenceId(prefix = 'REF'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a URL-safe slug
 * @param text - Text to slugify
 * @returns URL slug
 */
export function createSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  });
}

/**
 * Calculate the number of days between two dates
 * @param fromDate - Start date
 * @param toDate - End date
 * @returns Number of days (inclusive)
 */
export function calculateDays(fromDate: Date | string | number, toDate: Date | string | number): number {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to.getTime() - from.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Inclusive
}

/**
 * Format a date for display
 * @param date - Date to format
 * @param locale - Locale (default: 'en-IN')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number, locale = 'en-IN'): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Sanitize XSS from string input
 * @param input - User input string
 * @returns Sanitized string
 */
export function sanitizeInput(input: string | null | undefined): string | null | undefined {
  if (!input || typeof input !== 'string') return input;
  return xss(input.trim());
}

/**
 * Paginate query results
 * @param page - Current page (1-indexed)
 * @param limit - Items per page
 */
export function paginate(page: number | string = 1, limit: number | string = 50): { skip: number; take: number } {
  const safePage = Math.max(1, typeof page === 'string' ? parseInt(page, 10) || 1 : page);
  const safeLimit = Math.min(100, Math.max(1, typeof limit === 'string' ? parseInt(limit, 10) || 50 : limit));

  return {
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

/**
 * Build pagination metadata for response
 * @param total - Total records
 * @param page - Current page
 * @param limit - Items per page
 */
export function paginationMeta(total: number, page: number | string = 1, limit: number | string = 50): PaginationMeta {
  const safePage = Math.max(1, typeof page === 'string' ? parseInt(page, 10) || 1 : page);
  const safeLimit = Math.min(100, Math.max(1, typeof limit === 'string' ? parseInt(limit, 10) || 50 : limit));
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
 * @returns Academic year (e.g., '2026-27')
 */
export function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // Academic year starts in April (month 3)
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(2)}`;
  }
  return `${year - 1}-${String(year).slice(2)}`;
}
