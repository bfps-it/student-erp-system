import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

/**
 * BFPS ERP - Attendance Validation Schemas (Zod, TypeScript)
 * Period-wise marking, bulk operations, date-range queries
 */

// Single attendance entry for one student in one period
const attendanceEntrySchema = z.object({
  studentId: z.number({ required_error: 'Student ID is required' }).int().positive(),
  status: z.nativeEnum(AttendanceStatus, { required_error: 'Attendance status is required' }),
  note: z.string().max(500, 'Note must be under 500 characters').optional(),
});

// Mark attendance for a class (bulk operation)
export const markAttendanceSchema = z.object({
  classId: z.number({ required_error: 'Class ID is required' }).int().positive(),
  subjectId: z.number().int().positive().optional(),
  date: z
    .string({ required_error: 'Date is required' })
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format (use YYYY-MM-DD)' }),
  period: z
    .number({ required_error: 'Period is required' })
    .int()
    .min(1, 'Period must be between 1 and 8')
    .max(8, 'Period must be between 1 and 8'),
  entries: z
    .array(attendanceEntrySchema)
    .min(1, 'At least one attendance entry is required')
    .max(200, 'Maximum 200 entries per request'),
});

// Query attendance for a class on a specific date
export const getClassAttendanceSchema = z.object({
  classId: z
    .string()
    .refine((val) => !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0, {
      message: 'Class ID must be a positive integer',
    }),
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })
    .optional(),
  period: z
    .string()
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1 && num <= 8;
    }, { message: 'Period must be between 1 and 8' })
    .optional(),
});

// Query attendance for a single student with date range
export const getStudentAttendanceSchema = z.object({
  studentId: z
    .string()
    .refine((val) => !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0, {
      message: 'Student ID must be a positive integer',
    }),
  fromDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid fromDate format' })
    .optional(),
  toDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid toDate format' })
    .optional(),
});

// Query attendance stats for a class
export const getAttendanceStatsSchema = z.object({
  classId: z
    .string()
    .refine((val) => !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0, {
      message: 'Class ID must be a positive integer',
    }),
  month: z
    .string()
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 1 && num <= 12;
    }, { message: 'Month must be between 1 and 12' })
    .optional(),
  year: z
    .string()
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num >= 2020 && num <= 2099;
    }, { message: 'Year must be between 2020 and 2099' })
    .optional(),
});

// Infer TypeScript types from Zod schemas
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type AttendanceEntry = z.infer<typeof attendanceEntrySchema>;
export type GetClassAttendanceQuery = z.infer<typeof getClassAttendanceSchema>;
export type GetStudentAttendanceQuery = z.infer<typeof getStudentAttendanceSchema>;
export type GetAttendanceStatsQuery = z.infer<typeof getAttendanceStatsSchema>;
