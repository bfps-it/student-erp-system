import crypto from 'crypto';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

import { prisma } from '../config/database';
import { getRedis } from '../config/redis';
import logger from '../utils/logger';
import type {
  ServiceResult,
  LoginResult,
  TokenResult,
  Setup2FAResult,
  JwtAccessPayload,
  JwtRefreshPayload,
  Jwt2FAPayload,
} from '../types';

/**
 * BFPS ERP - Authentication Service (TypeScript)
 * Handles: JWT, bcrypt, TOTP 2FA, sessions, password management.
 */

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

/**
 * Generate JWT access token (15 min)
 */
function generateAccessToken(user: { id: number; email: string; role: string }): string {
  const payload: JwtAccessPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as import('@prisma/client').UserRole,
  };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: ACCESS_EXPIRY as '15m' });
}

/**
 * Generate JWT refresh token (7 days)
 */
function generateRefreshToken(user: { id: number }): string {
  const payload: JwtRefreshPayload = {
    userId: user.id,
    tokenType: 'refresh',
  };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: REFRESH_EXPIRY as '7d' });
}

/**
 * Generate temporary token for 2FA flow
 */
function generateTempToken(user: { id: number }): string {
  const payload: Jwt2FAPayload = {
    userId: user.id,
    tokenType: '2fa-pending',
  };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: '5m' });
}

/**
 * Hash password with bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Login user
 */
async function login(
  email: string,
  password: string,
  ipAddress: string,
  deviceInfo?: string
): Promise<LoginResult> {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return { success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - new Date().getTime()) / 60000);
    return {
      success: false,
      code: 'ACCOUNT_LOCKED',
      message: `Account locked. Try again in ${remainingMinutes} minutes.`,
    };
  }

  // Check if account is active
  if (!user.isActive) {
    return { success: false, code: 'ACCOUNT_DISABLED', message: 'Account is disabled. Contact administrator.' };
  }

  // Verify password
  const passwordValid = await comparePassword(password, user.passwordHash);

  if (!passwordValid) {
    // Increment failed attempts
    const failedAttempts = user.failedLoginAttempts + 1;
    const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: failedAttempts };

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      logger.warn(`Account locked: ${email} after ${failedAttempts} failed attempts`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return {
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
      remainingAttempts: MAX_FAILED_ATTEMPTS - failedAttempts,
    };
  }

  // Check if 2FA is enabled
  if (user.is2FAEnabled && user.twoFASecret) {
    const tempToken = generateTempToken(user);
    return {
      success: true,
      requires2FA: true,
      tempToken,
      message: 'Please enter your 2FA code.',
    };
  }

  // Reset failed attempts and update last login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Store refresh token session
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshToken,
      deviceInfo: deviceInfo ?? null,
      ipAddress,
      expiresAt,
    },
  });

  return {
    success: true,
    requires2FA: false,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Verify 2FA TOTP code and complete login
 */
async function verify2FA(
  email: string,
  tempToken: string,
  totpCode: string,
  ipAddress: string,
  deviceInfo?: string
): Promise<LoginResult> {
  // Verify temp token
  let decoded: Jwt2FAPayload;
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_ACCESS_SECRET!) as Jwt2FAPayload;
    if (decoded.tokenType !== '2fa-pending') {
      return { success: false, code: 'INVALID_TOKEN', message: 'Invalid 2FA token.' };
    }
  } catch {
    return { success: false, code: 'TOKEN_EXPIRED', message: '2FA session expired. Please login again.' };
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || user.email !== email || !user.twoFASecret) {
    return { success: false, code: 'INVALID_TOKEN', message: 'Invalid 2FA session.' };
  }

  // Verify TOTP
  const totp = new OTPAuth.TOTP({
    issuer: 'BFPS ERP',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.twoFASecret),
  });

  const delta = totp.validate({ token: totpCode, window: 1 });
  if (delta === null) {
    return { success: false, code: 'INVALID_2FA', message: 'Invalid 2FA code. Please try again.' };
  }

  // Complete login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.userSession.create({
    data: {
      userId: user.id,
      refreshToken,
      deviceInfo: deviceInfo ?? null,
      ipAddress,
      expiresAt,
    },
  });

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh access token
 */
async function refreshAccessToken(refreshTokenValue: string): Promise<TokenResult> {
  // Verify refresh token
  try {
    jwt.verify(refreshTokenValue, process.env.JWT_REFRESH_SECRET!);
  } catch {
    return { success: false, code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token.' };
  }

  // Find session
  const session = await prisma.userSession.findUnique({
    where: { refreshToken: refreshTokenValue },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    // If session found but expired, delete it
    if (session) {
      await prisma.userSession.delete({ where: { id: session.id } });
    }
    return { success: false, code: 'SESSION_EXPIRED', message: 'Session expired. Please login again.' };
  }

  if (!session.user.isActive) {
    return { success: false, code: 'ACCOUNT_DISABLED', message: 'Account is disabled.' };
  }

  // Generate new access token (rotate refresh token for security)
  const newAccessToken = generateAccessToken(session.user);
  const newRefreshToken = generateRefreshToken(session.user);

  // Update session with new refresh token
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.userSession.update({
    where: { id: session.id },
    data: {
      refreshToken: newRefreshToken,
      expiresAt: newExpiresAt,
    },
  });

  return {
    success: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

/**
 * Logout - delete session
 */
async function logout(refreshTokenValue: string): Promise<ServiceResult> {
  try {
    await prisma.userSession.delete({
      where: { refreshToken: refreshTokenValue },
    });
    return { success: true };
  } catch {
    // Session may already be deleted
    return { success: true };
  }
}

/**
 * Logout from all devices - delete all sessions
 */
async function logoutAll(userId: number): Promise<ServiceResult> {
  await prisma.userSession.deleteMany({
    where: { userId },
  });
  return { success: true };
}

/**
 * Change password
 */
async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<ServiceResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return { success: false, code: 'USER_NOT_FOUND', message: 'User not found.' };
  }

  const passwordValid = await comparePassword(currentPassword, user.passwordHash);
  if (!passwordValid) {
    return { success: false, code: 'INVALID_PASSWORD', message: 'Current password is incorrect.' };
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
    },
  });

  // Invalidate all other sessions
  await prisma.userSession.deleteMany({
    where: { userId },
  });

  return { success: true, message: 'Password changed successfully. Please login again.' };
}

/**
 * Setup 2FA - generate secret and QR code
 */
async function setup2FA(userId: number): Promise<Setup2FAResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return { success: false, code: 'USER_NOT_FOUND', message: 'User not found.' };
  }

  const secret = new OTPAuth.Secret({ size: 20 });

  const totp = new OTPAuth.TOTP({
    issuer: 'BFPS ERP',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  const otpauthUrl = totp.toString();
  const qrCode = await QRCode.toDataURL(otpauthUrl);

  // Store secret temporarily in Redis (or fallback to DB)
  const redis = getRedis();
  if (redis) {
    await redis.setex(`2fa-setup:${userId}`, 600, secret.base32); // 10 min TTL
  } else {
    // Store in user record temporarily
    await prisma.user.update({
      where: { id: userId },
      data: { twoFASecret: secret.base32 },
    });
  }

  return {
    success: true,
    secret: secret.base32,
    qrCode,
    message: 'Scan the QR code with your authenticator app.',
  };
}

/**
 * Verify 2FA setup - confirm TOTP code and enable 2FA
 */
async function verify2FASetup(userId: number, totpCode: string): Promise<ServiceResult> {
  let secret: string | null = null;
  const redis = getRedis();

  if (redis) {
    secret = await redis.get(`2fa-setup:${userId}`);
  }

  if (!secret) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    secret = user?.twoFASecret ?? null;
  }

  if (!secret) {
    return { success: false, code: 'SETUP_EXPIRED', message: '2FA setup session expired. Start again.' };
  }

  const totp = new OTPAuth.TOTP({
    issuer: 'BFPS ERP',
    label: '',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: totpCode, window: 1 });
  if (delta === null) {
    return { success: false, code: 'INVALID_CODE', message: 'Invalid verification code. Try again.' };
  }

  // Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: {
      is2FAEnabled: true,
      twoFASecret: secret,
    },
  });

  // Clean up Redis
  if (redis) {
    await redis.del(`2fa-setup:${userId}`);
  }

  return { success: true, message: '2FA enabled successfully.' };
}

/**
 * Disable 2FA
 */
async function disable2FA(userId: number): Promise<ServiceResult> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      is2FAEnabled: false,
      twoFASecret: null,
    },
  });

  return { success: true, message: '2FA disabled successfully.' };
}

/**
 * Forgot password - generate reset token
 */
async function forgotPassword(email: string): Promise<ServiceResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user || !user.isActive) {
    return { success: true, message: 'If the email exists, a reset link has been sent.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Store in Redis with 1 hour TTL
  const redis = getRedis();
  if (redis) {
    await redis.setex(`pwd-reset:${hashedToken}`, 3600, user.id.toString());
  }

  // TODO: Send email with reset link
  logger.info(`Password reset requested for ${email}. Token: ${resetToken}`);

  return { success: true, message: 'If the email exists, a reset link has been sent.' };
}

/**
 * Reset password using token
 */
async function resetPassword(token: string, newPassword: string): Promise<ServiceResult> {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const redis = getRedis();

  if (!redis) {
    return { success: false, code: 'SERVICE_UNAVAILABLE', message: 'Password reset is temporarily unavailable.' };
  }

  const userId = await redis.get(`pwd-reset:${hashedToken}`);
  if (!userId) {
    return { success: false, code: 'INVALID_TOKEN', message: 'Invalid or expired reset token.' };
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: parseInt(userId, 10) },
    data: {
      passwordHash: newHash,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  // Invalidate all sessions
  await prisma.userSession.deleteMany({
    where: { userId: parseInt(userId, 10) },
  });

  // Delete reset token
  await redis.del(`pwd-reset:${hashedToken}`);

  return { success: true, message: 'Password reset successfully. Please login with your new password.' };
}

/**
 * Get current user profile
 */
async function getProfile(userId: number): Promise<ServiceResult<unknown>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      is2FAEnabled: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNo: true,
          photoUrl: true,
        },
      },
      staff: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          department: true,
          designation: true,
          photoUrl: true,
        },
      },
    },
  });

  if (!user) {
    return { success: false, code: 'USER_NOT_FOUND', message: 'User not found.' };
  }

  return { success: true, data: user };
}

export {
  login,
  verify2FA,
  refreshAccessToken,
  logout,
  logoutAll,
  changePassword,
  setup2FA,
  verify2FASetup,
  disable2FA,
  forgotPassword,
  resetPassword,
  getProfile,
  hashPassword,
  comparePassword,
};
