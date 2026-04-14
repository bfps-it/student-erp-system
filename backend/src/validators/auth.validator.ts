import { z } from 'zod';

/**
 * BFPS ERP - Auth Validation Schemas (Zod, TypeScript)
 */

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});

export const verify2FASchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  tempToken: z.string({ required_error: 'Temporary token is required' }),
  totpCode: z
    .string({ required_error: 'TOTP code is required' })
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must be numeric'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }),
});

export const changePasswordSchema = z
  .object({
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
    confirmPassword: z.string({ required_error: 'Confirm password is required' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'Reset token is required' }),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/,
        'Password must contain uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z.string({ required_error: 'Confirm password is required' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const setup2FASchema = z.object({
  password: z
    .string({ required_error: 'Password is required to enable 2FA' })
    .min(8),
});

export const verify2FASetupSchema = z.object({
  totpCode: z
    .string({ required_error: 'TOTP code is required' })
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must be numeric'),
});

// Infer TypeScript types from Zod schemas
export type LoginInput = z.infer<typeof loginSchema>;
export type Verify2FAInput = z.infer<typeof verify2FASchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type Setup2FAInput = z.infer<typeof setup2FASchema>;
export type Verify2FASetupInput = z.infer<typeof verify2FASetupSchema>;
