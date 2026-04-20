import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { prisma } from '../config/database';
import logger from '../utils/logger';
import type { AuthRequest, JwtAccessPayload, AuthUser } from '../types';

/**
 * BFPS ERP - Authentication Middleware (TypeScript)
 * Verifies JWT access token and attaches user to request.
 */
const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. Please provide a valid token.',
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Token missing.' },
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtAccessPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        is2FAEnabled: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with this token no longer exists.',
        },
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled. Contact the administrator.',
        },
      });
      return;
    }

    req.user = user as AuthUser;
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Access token has expired. Please refresh your token.' },
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid access token.' },
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Auth middleware error: ${message}`);
    res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: 'Authentication error occurred.' },
    });
  }
};

/**
 * BFPS ERP - Role-Based Access Control (RBAC) Middleware
 */
const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required before authorization.' },
      });
      return;
    }

    // MASTER_ADMIN always has access
    if (req.user.role === 'MASTER_ADMIN') {
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `RBAC denied: User ${req.user.id} (${req.user.role}) attempted to access ${req.method} ${req.path}`
      );
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' },
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - attaches user if token present, continues if not.
 */
const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtAccessPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        is2FAEnabled: true,
        mustChangePassword: true,
      },
    });

    if (user && user.isActive) {
      req.user = user as AuthUser;
    }

    next();
  } catch {
    // Token invalid or expired — continue without auth
    next();
  }
};

export { authenticate, authorize, optionalAuth };
