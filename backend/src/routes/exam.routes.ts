import { Router } from 'express';

import {
  createExam,
  updateExam,
  getExams,
  deleteExam,
  enterMarks,
  publishResults,
  getResults,
  getRankList,
  downloadReportCard,
  getStudentHistory,
} from '../controllers/exam.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createExamSchema, updateExamSchema } from '../validators/exam.validator';

const router = Router();

/**
 * BFPS ERP - Exam Routes (Phase 4E)
 * Paths: /api/v1/exams/...
 */

// All routes require authentication
router.use(authenticate);

// ─── Exam CRUD ────────────────────────────────────────────
router.get('/', getExams);
router.post('/', validate(createExamSchema), createExam);
router.put('/:id', validate(updateExamSchema), updateExam);
router.delete('/:id', deleteExam);

// ─── Marks Entry ──────────────────────────────────────────
router.post('/:id/marks', enterMarks);

// ─── Publish Results ──────────────────────────────────────
router.post('/:id/publish', publishResults);

// ─── Results & Rank List ──────────────────────────────────
router.get('/:id/results', getResults);
router.get('/:id/ranklist', getRankList);

// ─── Report Card PDF ─────────────────────────────────────
router.get('/:examId/report-card/:studentId', downloadReportCard);

// ─── Student Exam History ─────────────────────────────────
router.get('/student/:id/history', getStudentHistory);

export default router;
