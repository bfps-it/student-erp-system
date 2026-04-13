const { z } = require('zod');

/**
 * BFPS ERP - Auth Validation Schemas (Zod)
 */

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});

const verify2FASchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  tempToken: z
    .string({ required_error: 'Temporary token is required' }),
  totpCode: z
    .string({ required_error: 'TOTP code is required' })
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must be numeric'),
});

const refreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token is required' }),
});

const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(8, 'Current password must be at least 8 characters'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  confirmPassword: z
    .string({ required_error: 'Confirm password is required' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
});

const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: 'Reset token is required' }),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  confirmPassword: z
    .string({ required_error: 'Confirm password is required' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const setup2FASchema = z.object({
  password: z
    .string({ required_error: 'Password is required to enable 2FA' })
    .min(8),
});

const verify2FASetupSchema = z.object({
  totpCode: z
    .string({ required_error: 'TOTP code is required' })
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must be numeric'),
});

module.exports = {
  loginSchema,
  verify2FASchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setup2FASchema,
  verify2FASetupSchema,
};
