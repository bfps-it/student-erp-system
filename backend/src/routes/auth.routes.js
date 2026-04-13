const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  loginSchema,
  verify2FASchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setup2FASchema,
  verify2FASetupSchema,
} = require('../validators/auth.validator');

const router = express.Router();

/**
 * BFPS ERP - Auth Routes
 * Prefix: /api/v1/auth
 */

// ---------- Public Routes (with auth rate limiter from app.locals) ----------

// Login
router.post(
  '/login',
  (req, res, next) => req.app.locals.authLimiter(req, res, next),
  validate(loginSchema),
  authController.login
);

// Verify 2FA code after login
router.post(
  '/verify-2fa',
  (req, res, next) => req.app.locals.authLimiter(req, res, next),
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
  (req, res, next) => req.app.locals.authLimiter(req, res, next),
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  (req, res, next) => req.app.locals.authLimiter(req, res, next),
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

module.exports = router;
