import { z } from 'zod';
import { FeeStatus, PaymentMethod } from '@prisma/client';

/**
 * BFPS ERP - Fee Validation Schemas (Zod, TypeScript)
 */

// ---------------------------------------------------------
// Fee Structure Schemas
// ---------------------------------------------------------

export const createFeeStructureSchema = z.object({
  className: z.string({ required_error: 'Class name is required' }).trim().min(1),
  feeType: z.string({ required_error: 'Fee type is required' }).trim().min(2),
  amount: z.number({ required_error: 'Amount is required' }).positive('Amount must be positive'),
  dueDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid due date format' })
    .optional(),
  academicYear: z
    .string({ required_error: 'Academic year is required' })
    .regex(/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY'),
});

export const updateFeeStructureSchema = createFeeStructureSchema.partial();

// ---------------------------------------------------------
// Fee Payment Initialization (Online/Offline)
// ---------------------------------------------------------

export const initiatePaymentSchema = z.object({
  studentId: z.number({ required_error: 'Student ID is required' }).int().positive(),
  feeType: z.string({ required_error: 'Fee type is required' }).trim().min(2),
  amount: z.number({ required_error: 'Amount is required' }).positive(),
  academicYear: z
    .string({ required_error: 'Academic year is required' })
    .regex(/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY'),
});

// ---------------------------------------------------------
// Record Offline Payment
// ---------------------------------------------------------

export const recordOfflinePaymentSchema = z.object({
  studentId: z.number({ required_error: 'Student ID is required' }).int().positive(),
  feeType: z.string({ required_error: 'Fee type is required' }).trim().min(2),
  amount: z.number({ required_error: 'Total amount is required' }).positive(),
  paidAmount: z.number({ required_error: 'Paid amount is required' }).positive(),
  discount: z.number().min(0).default(0),
  fineAmount: z.number().min(0).default(0),
  academicYear: z
    .string({ required_error: 'Academic year is required' })
    .regex(/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY'),
  paymentMethod: z.nativeEnum(PaymentMethod, { required_error: 'Payment method is required' }),
  transactionId: z.string().optional(),
  chequeNo: z.string().optional(),
  chequeDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid cheque date format' })
    .optional(),
  note: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (data.paymentMethod === 'CHEQUE' && !data.chequeNo) return false;
    return true;
  },
  { message: 'Cheque number is required for CHEQUE payments', path: ['chequeNo'] }
);

// ---------------------------------------------------------
// Razorpay Webhook Verification Schema
// ---------------------------------------------------------

export const verifyRazorpayPaymentSchema = z.object({
  razorpayOrderId: z.string({ required_error: 'Razorpay order ID is required' }),
  razorpayPaymentId: z.string({ required_error: 'Razorpay payment ID is required' }),
  razorpaySignature: z.string({ required_error: 'Razorpay signature is required' }),
});

// ---------------------------------------------------------
// Query Schemas
// ---------------------------------------------------------

export const getStudentFeesSchema = z.object({
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY')
    .optional(),
  status: z.nativeEnum(FeeStatus).optional(),
});

// Infer TypeScript types from Zod schemas
export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>;
export type UpdateFeeStructureInput = z.infer<typeof updateFeeStructureSchema>;
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type RecordOfflinePaymentInput = z.infer<typeof recordOfflinePaymentSchema>;
export type VerifyRazorpayPaymentInput = z.infer<typeof verifyRazorpayPaymentSchema>;
export type GetStudentFeesQuery = z.infer<typeof getStudentFeesSchema>;
