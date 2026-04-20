import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

/**
 * BFPS ERP - Attendance Validation Schemas (Phase 4C)
 * Follows FINAL_01: Period-wise marking with Class/Section/Date/Period/Subject.
 */

// ─── Single attendance record within a bulk request ────────
const attendanceRecordSchema = z.object({
  studentId: z.number({ required_error: 'Student ID is required' }).int().positive(),
  status: z.nativeEnum(AttendanceStatus, { required_error: 'Attendance status is required' }),
  note: z.string().max(200).optional(),
});

// ─── Mark Attendance (bulk for a class/section/period) ─────
export const markAttendanceSchema = z.object({
  classId: z.number({ required_error: 'Class ID is required' }).int().positive(),
  section: z.string({ required_error: 'Section is required' }).length(1).toUpperCase(),
  date: z.string({ required_error: 'Date is required' }).refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format (use YYYY-MM-DD)' }
  ),
  period: z.number({ required_error: 'Period is required' }).int().min(1).max(8),
  subjectId: z.number().int().positive().optional(),
  records: z
    .array(attendanceRecordSchema)
    .min(1, 'At least one attendance record is required'),
});

// ─── Query: Attendance by date ─────────────────────────────
export const getAttendanceByDateSchema = z.object({
  classId: z.coerce.number({ required_error: 'Class ID is required' }).int().positive(),
  section: z.string({ required_error: 'Section is required' }).length(1).toUpperCase(),
  date: z.string({ required_error: 'Date is required' }).refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  ),
  period: z.coerce.number().int().min(1).max(8).optional(),
});

// ─── Query: Monthly report ─────────────────────────────────
export const monthlyReportSchema = z.object({
  classId: z.coerce.number({ required_error: 'Class ID is required' }).int().positive(),
  section: z.string({ required_error: 'Section is required' }).length(1).toUpperCase(),
  month: z.coerce.number({ required_error: 'Month is required' }).int().min(1).max(12),
  year: z.coerce.number({ required_error: 'Year is required' }).int().min(2020).max(2099),
});

// ─── Query: Threshold alerts ───────────────────────────────
export const thresholdAlertSchema = z.object({
  classId: z.coerce.number().int().positive().optional(),
  threshold: z.coerce.number().min(0).max(100).default(75),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2099).optional(),
});

// ─── Inferred types ────────────────────────────────────────
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type GetAttendanceByDateInput = z.infer<typeof getAttendanceByDateSchema>;
export type MonthlyReportInput = z.infer<typeof monthlyReportSchema>;
export type ThresholdAlertInput = z.infer<typeof thresholdAlertSchema>;
