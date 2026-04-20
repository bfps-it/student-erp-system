import { z } from 'zod';
import { FeeStatus, PaymentMethod } from '@prisma/client';

/**
 * BFPS ERP - Fee Validation Schemas (Phase 4D)
 * Fee structure, payment collection, Razorpay integration, reports.
 */

// ─── Fee Structure CRUD ────────────────────────────────────

export const createFeeStructureSchema = z.object({
  className: z.string({ required_error: 'Class name is required' }).min(1).max(50),
  feeType: z.string({ required_error: 'Fee type is required' }).min(1).max(50),
  amount: z.number({ required_error: 'Amount is required' }).positive(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date' }).optional(),
  academicYear: z.string({ required_error: 'Academic year is required' }).regex(/^\d{4}-\d{4}$/, 'Use YYYY-YYYY format'),
});

export const updateFeeStructureSchema = createFeeStructureSchema.partial();

// ─── Collect Fee Payment ───────────────────────────────────

export const collectFeeSchema = z.object({
  studentId: z.number({ required_error: 'Student ID is required' }).int().positive(),
  feeType: z.string({ required_error: 'Fee type is required' }).min(1),
  amount: z.number({ required_error: 'Total amount is required' }).positive(),
  paidAmount: z.number({ required_error: 'Paid amount is required' }).min(0),
  discount: z.number().min(0).default(0),
  fineAmount: z.number().min(0).default(0),
  paymentMethod: z.nativeEnum(PaymentMethod, { required_error: 'Payment method is required' }),
  academicYear: z.string({ required_error: 'Academic year is required' }).regex(/^\d{4}-\d{4}$/),
  notes: z.string().max(500).optional(),
  chequeNo: z.string().max(30).optional(),
  chequeDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid cheque date' }).optional(),
  transactionId: z.string().max(100).optional(),
});

// ─── Razorpay Order Creation ───────────────────────────────

export const createRazorpayOrderSchema = z.object({
  studentId: z.number({ required_error: 'Student ID is required' }).int().positive(),
  feeType: z.string({ required_error: 'Fee type is required' }).min(1),
  amount: z.number({ required_error: 'Amount is required' }).positive(),
  academicYear: z.string({ required_error: 'Academic year is required' }).regex(/^\d{4}-\d{4}$/),
});

// ─── Razorpay Webhook Verification ────────────────────────

export const razorpayWebhookSchema = z.object({
  razorpay_order_id: z.string({ required_error: 'Order ID is required' }),
  razorpay_payment_id: z.string({ required_error: 'Payment ID is required' }),
  razorpay_signature: z.string({ required_error: 'Signature is required' }),
});

// ─── Fee Reports Query ─────────────────────────────────────

export const feeReportQuerySchema = z.object({
  classId: z.coerce.number().int().positive().optional(),
  section: z.string().length(1).toUpperCase().optional(),
  status: z.nativeEnum(FeeStatus).optional(),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2099).optional(),
});

// ─── Defaulter Query ───────────────────────────────────────

export const defaulterQuerySchema = z.object({
  classId: z.coerce.number().int().positive().optional(),
  section: z.string().length(1).toUpperCase().optional(),
  academicYear: z.string({ required_error: 'Academic year is required' }).regex(/^\d{4}-\d{4}$/),
  feeType: z.string().optional(),
});

// ─── Inferred Types ────────────────────────────────────────

export type CreateFeeStructureInput = z.infer<typeof createFeeStructureSchema>;
export type UpdateFeeStructureInput = z.infer<typeof updateFeeStructureSchema>;
export type CollectFeeInput = z.infer<typeof collectFeeSchema>;
export type CreateRazorpayOrderInput = z.infer<typeof createRazorpayOrderSchema>;
export type RazorpayWebhookInput = z.infer<typeof razorpayWebhookSchema>;
export type FeeReportQueryInput = z.infer<typeof feeReportQuerySchema>;
export type DefaulterQueryInput = z.infer<typeof defaulterQuerySchema>;
