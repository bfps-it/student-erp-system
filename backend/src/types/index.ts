import { Request } from 'express';
import { UserRole } from '@prisma/client';

/**
 * BFPS ERP - Shared Type Definitions
 */

// ============================================
// Authentication Types
// ============================================

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  isActive: boolean;
  is2FAEnabled: boolean;
  mustChangePassword: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  _auditBefore?: Record<string, unknown>;
}

export interface JwtAccessPayload {
  userId: number;
  email: string;
  role: UserRole;
}

export interface JwtRefreshPayload {
  userId: number;
  tokenType: 'refresh';
}

export interface Jwt2FAPayload {
  userId: number;
  tokenType: '2fa-pending';
}

// ============================================
// Service Response Types
// ============================================

export interface ServiceResult<T = undefined> {
  success: boolean;
  code?: string;
  message?: string;
  data?: T;
}

export interface LoginResult {
  success: boolean;
  code?: string;
  message?: string;
  requires2FA?: boolean;
  tempToken?: string;
  remainingAttempts?: number;
  user?: {
    id: number;
    email: string;
    role: UserRole;
    mustChangePassword: boolean;
  };
  accessToken?: string;
  refreshToken?: string;
}

export interface TokenResult {
  success: boolean;
  code?: string;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface Setup2FAResult {
  success: boolean;
  code?: string;
  message?: string;
  secret?: string;
  qrCode?: string;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationParams {
  skip: number;
  take: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  pagination?: PaginationMeta;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    remainingAttempts?: number;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// Encryption Types
// ============================================

export interface EncryptedField {
  encrypted: string | null;
  masked: string | null;
}

// ============================================
// Cloudinary Types
// ============================================

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  size: number;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  resource_type?: 'auto' | 'image' | 'video' | 'raw';
  quality?: string;
  transformation?: Record<string, unknown>[];
}

// ============================================
// Audit Types
// ============================================

export interface AuditLogData {
  userId: number;
  module: string;
  action: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress: string;
  userAgent: string | null;
}
