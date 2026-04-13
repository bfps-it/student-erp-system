const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

/**
 * BFPS ERP - Authentication Middleware
 * Verifies JWT access token and attaches user to request.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. Please provide a valid token.',
        },
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Fetch user from database
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
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with this token no longer exists.',
        },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled. Contact the administrator.',
        },
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired. Please refresh your token.',
        },
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token.',
        },
      });
    }

    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error occurred.',
      },
    });
  }
};

/**
 * BFPS ERP - Role-Based Access Control (RBAC) Middleware
 * Restricts access to specific roles. Must be used AFTER authenticate.
 *
 * @param  {...string} allowedRoles - Roles allowed to access the route
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/admin', authenticate, authorize('MASTER_ADMIN', 'ADMIN'), handler)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required before authorization.',
        },
      });
    }

    // MASTER_ADMIN always has access
    if (req.user.role === 'MASTER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`RBAC denied: User ${req.user.id} (${req.user.role}) attempted to access ${req.method} ${req.path}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
        },
      });
    }

    next();
  };
};

/**
 * Optional authentication - attaches user if token present, continues if not.
 * Useful for public endpoints that show different data for authenticated users.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch {
    // Token invalid or expired -- continue without auth
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};
