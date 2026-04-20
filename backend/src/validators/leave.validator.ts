import { z } from 'zod';
import { LeaveType, LeaveStatus, LeaveSource, ApprovalAction } from '@prisma/client';

/**
 * BFPS ERP - Leave Validators (Phase 4F - Part 2)
 */

export const applyLeaveSchema = z.object({
  staffId: z.number().int().positive(),
  leaveType: z.nativeEnum(LeaveType),
  fromDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid from date'),
  toDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid to date'),
  reason: z.string().min(5, 'Reason is required').max(1000),
  attachmentUrl: z.string().url().optional(),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;

export const leaveActionSchema = z.object({
  action: z.nativeEnum(ApprovalAction),
  note: z.string().max(500).optional(),
}).refine(
  (data) => data.action !== 'REJECTED' || (data.note && data.note.length > 0),
  { message: 'Note is required when rejecting', path: ['note'] }
);

export type LeaveActionInput = z.infer<typeof leaveActionSchema>;

export const leaveQuerySchema = z.object({
  status: z.nativeEnum(LeaveStatus).optional(),
  staffId: z.coerce.number().int().positive().optional(),
  source: z.nativeEnum(LeaveSource).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type LeaveQueryInput = z.infer<typeof leaveQuerySchema>;
