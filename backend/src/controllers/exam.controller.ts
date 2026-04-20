import { Request, Response, NextFunction } from 'express';

import * as ExamService from '../services/exam.service';
import { getReportCardData, generateReportCardPdf } from '../services/report-card.service';
import type {
  CreateExamInput,
  UpdateExamInput,
  MarksEntryInput,
  ExamQueryInput,
} from '../validators/exam.validator';

/**
 * BFPS ERP - Exam Controller (Phase 4E)
 */

// ─── CRUD ─────────────────────────────────────────────────

export const createExam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as CreateExamInput;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createdBy = (req as any).user?.staffId ?? (req as any).user?.id ?? 0;
    const exam = await ExamService.createExam(data, createdBy);
    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

export const updateExam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const data = req.body as UpdateExamInput;
    const exam = await ExamService.updateExam(id, data);
    res.status(200).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

export const getExams = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = req.query as unknown as ExamQueryInput;
    const exams = await ExamService.getExams(filters);
    res.status(200).json({ success: true, data: exams });
  } catch (error) {
    next(error);
  }
};

export const deleteExam = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await ExamService.deleteExam(id);
    res.status(200).json({ success: true, message: 'Exam deleted' });
  } catch (error) {
    next(error);
  }
};

// ─── Marks Entry ──────────────────────────────────────────

export const enterMarks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const examId = parseInt(req.params.id as string, 10);
    const body = req.body as Omit<MarksEntryInput, 'examId'>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enteredBy = (req as any).user?.staffId ?? (req as any).user?.id ?? 0;
    const result = await ExamService.enterMarks({ examId, results: body.results }, enteredBy);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ─── Publish Results ──────────────────────────────────────

export const publishResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { publish } = req.body as { publish?: boolean };
    const exam = await ExamService.publishResults(id, publish !== false);
    res.status(200).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

// ─── Results ──────────────────────────────────────────────

export const getResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = (req as any).user?.role;
    const isAdmin = ['MASTER_ADMIN', 'ADMIN', 'PRINCIPAL', 'DIRECTOR', 'TEACHER'].includes(userRole);
    const results = await ExamService.getResultsByExam(id, isAdmin);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

// ─── Rank List ────────────────────────────────────────────

export const getRankList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const data = await ExamService.getRankList(id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// ─── Report Card PDF ──────────────────────────────────────

export const downloadReportCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const examId = parseInt(req.params.examId as string, 10);
    const studentId = parseInt(req.params.studentId as string, 10);

    const data = await getReportCardData(examId, studentId);
    const doc = generateReportCardPdf(data);

    const filename = `report_card_${data.student.admissionNo}_${data.examType}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    next(error);
  }
};

// ─── Student History ──────────────────────────────────────

export const getStudentHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = parseInt(req.params.id as string, 10);
    const history = await ExamService.getStudentExamHistory(studentId);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};
