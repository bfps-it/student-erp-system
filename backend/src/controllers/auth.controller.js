const authService = require('../services/auth.service');
const logger = require('../utils/logger');

/**
 * BFPS ERP - Auth Controller
 * Handles all authentication-related HTTP endpoints.
 */

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const deviceInfo = req.headers['user-agent'];

    const result = await authService.login(email, password, ipAddress, deviceInfo);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
          remainingAttempts: result.remainingAttempts,
        },
      });
    }

    if (result.requires2FA) {
      return res.status(200).json({
        success: true,
        data: {
          requires2FA: true,
          tempToken: result.tempToken,
          message: result.message,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/verify-2fa
 */
const verify2FA = async (req, res, next) => {
  try {
    const { email, tempToken, totpCode } = req.body;
    const ipAddress = req.ip;
    const deviceInfo = req.headers['user-agent'];

    const result = await authService.verify2FA(email, tempToken, totpCode, ipAddress, deviceInfo);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    const result = await authService.refreshAccessToken(token);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    await authService.logout(token);

    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully.' },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/logout-all
 */
const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAll(req.user.id);

    return res.status(200).json({
      success: true,
      data: { message: 'Logged out from all devices.' },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { message: result.message },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);

    return res.status(200).json({
      success: true,
      data: { message: result.message },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { message: result.message },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/2fa/setup
 */
const setup2FA = async (req, res, next) => {
  try {
    const result = await authService.setup2FA(req.user.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        secret: result.secret,
        qrCode: result.qrCode,
        message: result.message,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/auth/2fa/verify
 */
const verify2FASetup = async (req, res, next) => {
  try {
    const { totpCode } = req.body;
    const result = await authService.verify2FASetup(req.user.id, totpCode);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { message: result.message },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/auth/2fa/disable
 */
const disable2FA = async (req, res, next) => {
  try {
    const result = await authService.disable2FA(req.user.id);

    return res.status(200).json({
      success: true,
      data: { message: result.message },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/auth/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const result = await authService.getProfile(req.user.id);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  verify2FA,
  refreshToken,
  logout,
  logoutAll,
  changePassword,
  forgotPassword,
  resetPassword,
  setup2FA,
  verify2FASetup,
  disable2FA,
  getProfile,
};
