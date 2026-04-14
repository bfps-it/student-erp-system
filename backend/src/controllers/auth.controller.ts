import { Response, NextFunction } from 'express';

import * as authService from '../services/auth.service';
import type { AuthRequest } from '../types';
import type {
  LoginInput,
  Verify2FAInput,
  RefreshTokenInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  Verify2FASetupInput,
} from '../validators/auth.validator';

/**
 * BFPS ERP - Auth Controller (TypeScript)
 * Handles all authentication-related HTTP endpoints.
 */

/**
 * POST /api/v1/auth/login
 */
export const login = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;
    const ipAddress = req.ip ?? 'unknown';
    const deviceInfo = req.headers['user-agent'];

    const result = await authService.login(email, password, ipAddress, deviceInfo);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
          remainingAttempts: result.remainingAttempts,
        },
      });
      return;
    }

    if (result.requires2FA) {
      res.status(200).json({
        success: true,
        data: {
          requires2FA: true,
          tempToken: result.tempToken,
          message: result.message,
        },
      });
      return;
    }

    res.status(200).json({
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
export const verify2FA = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, tempToken, totpCode } = req.body as Verify2FAInput;
    const ipAddress = req.ip ?? 'unknown';
    const deviceInfo = req.headers['user-agent'];

    const result = await authService.verify2FA(email, tempToken, totpCode, ipAddress, deviceInfo);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
      return;
    }

    res.status(200).json({
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
export const refreshToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as RefreshTokenInput;
    const result = await authService.refreshAccessToken(token);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
      return;
    }

    res.status(200).json({
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
export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body as RefreshTokenInput;
    await authService.logout(token);

    res.status(200).json({
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
export const logoutAll = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    await authService.logoutAll(req.user.id);

    res.status(200).json({
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
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    const { currentPassword, newPassword } = req.body as ChangePasswordInput;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
      return;
    }

    res.status(200).json({
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
export const forgotPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body as ForgotPasswordInput;
    const result = await authService.forgotPassword(email);

    res.status(200).json({
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
export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = req.body as ResetPasswordInput;
    const result = await authService.resetPassword(token, newPassword);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
      return;
    }

    res.status(200).json({
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
export const setup2FA = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    const result = await authService.setup2FA(req.user.id);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
      return;
    }

    res.status(200).json({
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
export const verify2FASetup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    const { totpCode } = req.body as Verify2FASetupInput;
    const result = await authService.verify2FASetup(req.user.id, totpCode);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
      return;
    }

    res.status(200).json({
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
export const disable2FA = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    const result = await authService.disable2FA(req.user.id);

    res.status(200).json({
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
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
      return;
    }

    const result = await authService.getProfile(req.user.id);

    if (!result.success) {
      res.status(404).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};
