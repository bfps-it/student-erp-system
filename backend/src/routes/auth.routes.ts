import { Router, Request, Response, NextFunction } from 'express';

import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  loginSchema,
  verify2FASchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verify2FASetupSchema,
} from '../validators/auth.validator';

const router = Router();

/**
 * BFPS ERP - Auth Routes (TypeScript)
 * Prefix: /api/v1/auth
 */

// ---------- Public Routes (with auth rate limiter from app.locals) ----------

// Login
router.post(
  '/login',
  (req: Request, res: Response, next: NextFunction) => {
    // Call the rate limiter middleware attached to app.locals
    const limiter = req.app.locals.authLimiter;
    if (limiter) {
      limiter(req, res, next);
    } else {
      next();
    }
  },
  validate(loginSchema),
  authController.login
);

// Verify 2FA code after login
router.post(
  '/verify-2fa',
  (req: Request, res: Response, next: NextFunction) => {
    const limiter = req.app.locals.authLimiter;
    if (limiter) {
      limiter(req, res, next);
    } else {
      next();
    }
  },
  validate(verify2FASchema),
  authController.verify2FA
);

// Refresh access token
router.post(
  '/refresh',
  validate(refreshTokenSchema),
  authController.refreshToken
);

// Forgot password
router.post(
  '/forgot-password',
  (req: Request, res: Response, next: NextFunction) => {
    const limiter = req.app.locals.authLimiter;
    if (limiter) {
      limiter(req, res, next);
    } else {
      next();
    }
  },
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  (req: Request, res: Response, next: NextFunction) => {
    const limiter = req.app.locals.authLimiter;
    if (limiter) {
      limiter(req, res, next);
    } else {
      next();
    }
  },
  validate(resetPasswordSchema),
  authController.resetPassword
);

// ---------- Authenticated Routes ----------

// Logout
router.post(
  '/logout',
  authenticate,
  validate(refreshTokenSchema),
  authController.logout
);

// Logout from all devices
router.post(
  '/logout-all',
  authenticate,
  authController.logoutAll
);

// Change password
router.put(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

// Get profile
router.get(
  '/profile',
  authenticate,
  authController.getProfile
);

// ---------- 2FA Management ----------

// Setup 2FA (get QR code)
router.post(
  '/2fa/setup',
  authenticate,
  // Note: setup doesn't strictly need a validator here as it just generates a secret
  authController.setup2FA
);

// Verify 2FA setup (confirm code)
router.post(
  '/2fa/verify',
  authenticate,
  validate(verify2FASetupSchema),
  authController.verify2FASetup
);

// Disable 2FA
router.delete(
  '/2fa/disable',
  authenticate,
  authController.disable2FA
);

export default router;
