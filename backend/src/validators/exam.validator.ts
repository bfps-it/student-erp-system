import { z } from 'zod';
import { ExamType } from '@prisma/client';

/**
 * BFPS ERP - Exam Validators (Phase 4E)
 * Zod schemas for exam CRUD, marks entry, and queries.
 */

// Academic year pattern: 2025-2026
const academicYearRegex = /^\d{4}-\d{4}$/;

// ─── Create Exam ──────────────────────────────────────────

export const createExamSchema = z.object({
  name: z.string().min(2, 'Exam name required').max(100),
  examType: z.nativeEnum(ExamType),
  classId: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  startTime: z.string().optional(),
  duration: z.number().int().positive().optional(),
  maxMarks: z.number().int().positive().max(200, 'Max marks cannot exceed 200'),
  passingMarks: z.number().int().min(0),
  venue: z.string().max(100).optional(),
  academicYear: z.string().regex(academicYearRegex, 'Use YYYY-YYYY format'),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;

// ─── Update Exam ──────────────────────────────────────────

export const updateExamSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  examType: z.nativeEnum(ExamType).optional(),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date').optional(),
  startTime: z.string().optional(),
  duration: z.number().int().positive().optional(),
  maxMarks: z.number().int().positive().max(200).optional(),
  passingMarks: z.number().int().min(0).optional(),
  venue: z.string().max(100).optional(),
});

export type UpdateExamInput = z.infer<typeof updateExamSchema>;

// ─── Marks Entry (Bulk) ───────────────────────────────────

/**
 * Each result row: studentId + marksObtained
 * marksObtained is validated at service level against exam.maxMarks
 * (Zod can only enforce 0+ here; upper bound is dynamic)
 */
export const marksEntrySchema = z.object({
  examId: z.number().int().positive(),
  results: z.array(
    z.object({
      studentId: z.number().int().positive(),
      marksObtained: z.number().min(0, 'Marks cannot be negative'),
      remarks: z.string().max(200).optional(),
    })
  ).min(1, 'At least one result is required'),
});

export type MarksEntryInput = z.infer<typeof marksEntrySchema>;

// ─── Exam Query Filters ──────────────────────────────────

export const examQuerySchema = z.object({
  classId: z.coerce.number().int().positive().optional(),
  examType: z.nativeEnum(ExamType).optional(),
  academicYear: z.string().regex(academicYearRegex).optional(),
  subjectId: z.coerce.number().int().positive().optional(),
});

export type ExamQueryInput = z.infer<typeof examQuerySchema>;
