/**
 * BFPS ERP - Exam Module Tests (Phase 4E)
 * Covers validators, grading, ranking, service logic, and report card.
 */

import {
  createExamSchema,
  marksEntrySchema,
  examQuerySchema,
} from '../validators/exam.validator';

// ─── Mock Prisma ───────────────────────────────────────────

const mockPrisma = {
  exam: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  examResult: {
    count: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  student: { findUnique: jest.fn() },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $transaction: jest.fn() as any,
};

jest.mock('../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../utils/logger', () => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn() };
  return { __esModule: true, default: logger };
});

// ============================================================
// VALIDATOR TESTS
// ============================================================

describe('Exam Validators', () => {
  describe('createExamSchema', () => {
    it('should validate a correct exam creation', () => {
      const result = createExamSchema.safeParse({
        name: 'Unit Test 1',
        examType: 'UT',
        classId: 1,
        subjectId: 1,
        date: '2025-07-15',
        maxMarks: 100,
        passingMarks: 33,
        academicYear: '2025-2026',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all exam types', () => {
      for (const type of ['UT', 'HY', 'ANNUAL', 'BOARD', 'MOCK', 'PRACTICAL']) {
        const result = createExamSchema.safeParse({
          name: `Test ${type}`,
          examType: type,
          classId: 1,
          subjectId: 1,
          date: '2025-07-15',
          maxMarks: 100,
          passingMarks: 33,
          academicYear: '2025-2026',
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid exam type', () => {
      const result = createExamSchema.safeParse({
        name: 'Invalid',
        examType: 'WEEKLY',
        classId: 1,
        subjectId: 1,
        date: '2025-07-15',
        maxMarks: 100,
        passingMarks: 33,
        academicYear: '2025-2026',
      });
      expect(result.success).toBe(false);
    });

    it('should reject max marks above 200', () => {
      const result = createExamSchema.safeParse({
        name: 'High Marks',
        examType: 'ANNUAL',
        classId: 1,
        subjectId: 1,
        date: '2025-07-15',
        maxMarks: 500,
        passingMarks: 33,
        academicYear: '2025-2026',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('marksEntrySchema', () => {
    it('should validate correct marks entry', () => {
      const result = marksEntrySchema.safeParse({
        examId: 1,
        results: [
          { studentId: 1, marksObtained: 85 },
          { studentId: 2, marksObtained: 42 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative marks', () => {
      const result = marksEntrySchema.safeParse({
        examId: 1,
        results: [{ studentId: 1, marksObtained: -5 }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty results array', () => {
      const result = marksEntrySchema.safeParse({
        examId: 1,
        results: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('examQuerySchema', () => {
    it('should accept valid query filters', () => {
      const result = examQuerySchema.safeParse({
        classId: '1',
        examType: 'HY',
        academicYear: '2025-2026',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty query', () => {
      const result = examQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================
// SERVICE TESTS - GRADING
// ============================================================

import { calculateGrade } from '../services/exam.service';

describe('ICSE Grading - calculateGrade()', () => {
  it('should return A1 for 95%', () => {
    expect(calculateGrade(95)).toEqual({ grade: 'A1', isPassed: true });
  });

  it('should return A1 for exactly 90%', () => {
    expect(calculateGrade(90)).toEqual({ grade: 'A1', isPassed: true });
  });

  it('should return A2 for 85%', () => {
    expect(calculateGrade(85)).toEqual({ grade: 'A2', isPassed: true });
  });

  it('should return B1 for 72%', () => {
    expect(calculateGrade(72)).toEqual({ grade: 'B1', isPassed: true });
  });

  it('should return B2 for 65%', () => {
    expect(calculateGrade(65)).toEqual({ grade: 'B2', isPassed: true });
  });

  it('should return C1 for 55%', () => {
    expect(calculateGrade(55)).toEqual({ grade: 'C1', isPassed: true });
  });

  it('should return C2 for 45%', () => {
    expect(calculateGrade(45)).toEqual({ grade: 'C2', isPassed: true });
  });

  it('should return D for 35%', () => {
    expect(calculateGrade(35)).toEqual({ grade: 'D', isPassed: true });
  });

  it('should return E (fail) for 30%', () => {
    expect(calculateGrade(30)).toEqual({ grade: 'E', isPassed: false });
  });

  it('should return E (fail) for 0%', () => {
    expect(calculateGrade(0)).toEqual({ grade: 'E', isPassed: false });
  });
});

// ============================================================
// SERVICE TESTS - EXAM CRUD & MARKS
// ============================================================

import * as ExamService from '../services/exam.service';

describe('Exam Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExam', () => {
    it('should create an exam record', async () => {
      const mockExam = {
        id: 1, name: 'UT-1 Maths', examType: 'UT',
        maxMarks: 100, passingMarks: 33,
        class: { name: 'Class 5', section: 'A' },
        subject: { name: 'Mathematics', code: 'MATH05' },
      };
      mockPrisma.exam.create.mockResolvedValue(mockExam);

      const result = await ExamService.createExam({
        name: 'UT-1 Maths',
        examType: 'UT',
        classId: 1,
        subjectId: 1,
        date: '2025-07-15',
        maxMarks: 100,
        passingMarks: 33,
        academicYear: '2025-2026',
      }, 1);

      expect(result).toEqual(mockExam);
      expect(mockPrisma.exam.create).toHaveBeenCalledTimes(1);
    });

    it('should throw if passingMarks > maxMarks', async () => {
      await expect(
        ExamService.createExam({
          name: 'Bad Exam',
          examType: 'UT',
          classId: 1,
          subjectId: 1,
          date: '2025-07-15',
          maxMarks: 50,
          passingMarks: 60,
          academicYear: '2025-2026',
        }, 1)
      ).rejects.toThrow('Passing marks cannot exceed max marks');
    });
  });

  describe('enterMarks', () => {
    it('should reject marks exceeding maxMarks', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({ id: 1, maxMarks: 100 });

      await expect(
        ExamService.enterMarks({
          examId: 1,
          results: [{ studentId: 1, marksObtained: 120 }],
        }, 1)
      ).rejects.toThrow('exceed max marks');
    });

    it('should save marks and calculate ranks', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({ id: 1, maxMarks: 100 });
      mockPrisma.examResult.upsert.mockResolvedValue({});
      mockPrisma.$transaction = jest.fn().mockResolvedValue([{}, {}]);

      // For calculateRanks
      mockPrisma.examResult.findMany.mockResolvedValue([
        { id: 1, marksObtained: 95 },
        { id: 2, marksObtained: 72 },
      ]);
      mockPrisma.examResult.update.mockResolvedValue({});

      const result = await ExamService.enterMarks({
        examId: 1,
        results: [
          { studentId: 1, marksObtained: 95 },
          { studentId: 2, marksObtained: 72 },
        ],
      }, 1);

      expect(result.saved).toBe(2);
    });
  });

  describe('calculateRanks', () => {
    it('should assign rank 1 to highest marks', async () => {
      mockPrisma.examResult.findMany.mockResolvedValue([
        { id: 1, marksObtained: 98 },
        { id: 2, marksObtained: 85 },
        { id: 3, marksObtained: 72 },
      ]);
      mockPrisma.examResult.update.mockResolvedValue({});

      await ExamService.calculateRanks(1);

      // First call should set rank 1
      expect(mockPrisma.examResult.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: { rank: 1 } })
      );
      // Second call should set rank 2
      expect(mockPrisma.examResult.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 2 }, data: { rank: 2 } })
      );
    });
  });

  describe('publishResults', () => {
    it('should toggle isResultPublished', async () => {
      mockPrisma.exam.update.mockResolvedValue({ id: 1, isResultPublished: true });

      const result = await ExamService.publishResults(1, true);
      expect(result.isResultPublished).toBe(true);
    });
  });

  describe('getResultsByExam', () => {
    it('should not return results before publish (student access)', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 1, isResultPublished: false,
        class: { name: 'Class 5', section: 'A' },
        subject: { name: 'Maths', code: 'M5' },
      });

      const data = await ExamService.getResultsByExam(1, false);
      expect(data.results).toEqual([]);
      expect(data.message).toContain('not yet published');
    });

    it('should return results after publish', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: 1, isResultPublished: true,
        class: { name: 'Class 5', section: 'A' },
        subject: { name: 'Maths', code: 'M5' },
      });
      mockPrisma.examResult.findMany.mockResolvedValue([
        { id: 1, marksObtained: 92, grade: 'A1', rank: 1, student: { firstName: 'Raj' } },
      ]);

      const data = await ExamService.getResultsByExam(1, false);
      expect(data.results.length).toBe(1);
    });
  });

  describe('getStudentExamHistory', () => {
    it('should return results grouped by academic year', async () => {
      mockPrisma.examResult.findMany.mockResolvedValue([
        { exam: { academicYear: '2025-2026', name: 'UT1' } },
        { exam: { academicYear: '2025-2026', name: 'HY' } },
        { exam: { academicYear: '2024-2025', name: 'Annual' } },
      ]);

      const history = await ExamService.getStudentExamHistory(1);
      expect(history.totalExams).toBe(3);
      expect(Object.keys(history.history)).toContain('2025-2026');
      expect(Object.keys(history.history)).toContain('2024-2025');
    });
  });
});

// ============================================================
// REPORT CARD TEST
// ============================================================

import { generateReportCardPdf } from '../services/report-card.service';

describe('Report Card PDF', () => {
  it('should generate PDF without error', () => {
    const doc = generateReportCardPdf({
      student: {
        admissionNo: 'BFPS-2025-001',
        firstName: 'Raj',
        lastName: 'Singh',
        rollNo: 12,
        section: 'A',
        fatherName: 'Harpreet Singh',
        motherName: 'Kamaljit Kaur',
        dateOfBirth: new Date('2013-05-15'),
      },
      className: 'Class 5-A',
      examName: 'Half Yearly 2025',
      examType: 'HY',
      academicYear: '2025-2026',
      results: [
        { subjectName: 'Mathematics', subjectCode: 'MATH05', maxMarks: 100, marksObtained: 92, grade: 'A1', isPassed: true },
        { subjectName: 'English', subjectCode: 'ENG05', maxMarks: 100, marksObtained: 78, grade: 'B1', isPassed: true },
        { subjectName: 'Science', subjectCode: 'SCI05', maxMarks: 100, marksObtained: 25, grade: 'E', isPassed: false },
      ],
      rank: 3,
    });

    expect(doc).toBeDefined();
    expect(typeof doc.pipe).toBe('function');
    expect(typeof doc.end).toBe('function');

    // End the doc to prevent open handle
    doc.end();
  });
});
