import { Prisma } from '@prisma/client';

import { prisma } from '../config/database';
import logger from '../utils/logger';
import type {
  CreateExamInput,
  UpdateExamInput,
  MarksEntryInput,
  ExamQueryInput,
} from '../validators/exam.validator';

/**
 * BFPS ERP - Exam Service (Phase 4E)
 * Exam management, marks entry, ICSE grading, ranking, result publishing.
 */

// ─── ICSE Grading Scale ───────────────────────────────────

export function calculateGrade(percentage: number): { grade: string; isPassed: boolean } {
  if (percentage >= 90) return { grade: 'A1', isPassed: true };
  if (percentage >= 80) return { grade: 'A2', isPassed: true };
  if (percentage >= 70) return { grade: 'B1', isPassed: true };
  if (percentage >= 60) return { grade: 'B2', isPassed: true };
  if (percentage >= 50) return { grade: 'C1', isPassed: true };
  if (percentage >= 40) return { grade: 'C2', isPassed: true };
  if (percentage >= 33) return { grade: 'D', isPassed: true };
  return { grade: 'E', isPassed: false };
}

// ─── Create Exam ──────────────────────────────────────────

export async function createExam(data: CreateExamInput, createdBy: number) {
  if (data.passingMarks > data.maxMarks) {
    throw new Error('Passing marks cannot exceed max marks');
  }

  const exam = await prisma.exam.create({
    data: {
      name: data.name,
      examType: data.examType,
      classId: data.classId,
      subjectId: data.subjectId,
      examDate: new Date(data.date),
      startTime: data.startTime ?? null,
      duration: data.duration ?? null,
      maxMarks: data.maxMarks,
      passingMarks: data.passingMarks,
      venue: data.venue ?? null,
      academicYear: data.academicYear,
      createdBy,
    },
    include: {
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } },
    },
  });

  logger.info(`Exam created: "${exam.name}" (${exam.examType}) for class ${exam.class.name}-${exam.class.section}`);
  return exam;
}

// ─── Update Exam ──────────────────────────────────────────

export async function updateExam(id: number, data: UpdateExamInput) {
  const updated = await prisma.exam.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.examType && { examType: data.examType }),
      ...(data.date && { examDate: new Date(data.date) }),
      ...(data.startTime !== undefined && { startTime: data.startTime }),
      ...(data.duration !== undefined && { duration: data.duration }),
      ...(data.maxMarks !== undefined && { maxMarks: data.maxMarks }),
      ...(data.passingMarks !== undefined && { passingMarks: data.passingMarks }),
      ...(data.venue !== undefined && { venue: data.venue }),
    },
    include: {
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } },
    },
  });
  return updated;
}

// ─── Get Exams (Filtered) ─────────────────────────────────

export async function getExams(filters: ExamQueryInput) {
  const where: Prisma.ExamWhereInput = {};
  if (filters.classId) where.classId = filters.classId;
  if (filters.examType) where.examType = filters.examType;
  if (filters.academicYear) where.academicYear = filters.academicYear;
  if (filters.subjectId) where.subjectId = filters.subjectId;

  return prisma.exam.findMany({
    where,
    include: {
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } },
      _count: { select: { results: true } },
    },
    orderBy: [{ examDate: 'desc' }, { name: 'asc' }],
  });
}

// ─── Delete Exam ──────────────────────────────────────────

export async function deleteExam(id: number) {
  // Check no results exist
  const count = await prisma.examResult.count({ where: { examId: id } });
  if (count > 0) {
    throw new Error('Cannot delete exam with existing results. Remove results first.');
  }
  return prisma.exam.delete({ where: { id } });
}

// ─── Enter Marks (Bulk) ───────────────────────────────────

export async function enterMarks(data: MarksEntryInput, enteredBy: number) {
  const exam = await prisma.exam.findUnique({ where: { id: data.examId } });
  if (!exam) throw new Error('Exam not found');

  // Per-row validation against maxMarks
  for (const row of data.results) {
    if (row.marksObtained < 0) {
      throw new Error(`Marks for student ${row.studentId} cannot be negative`);
    }
    if (row.marksObtained > exam.maxMarks) {
      throw new Error(
        `Marks for student ${row.studentId} (${row.marksObtained}) exceed max marks (${exam.maxMarks})`
      );
    }
  }

  const upsertResults = data.results.map((row) => {
    const percentage = (row.marksObtained / exam.maxMarks) * 100;
    const { grade, isPassed } = calculateGrade(percentage);

    return prisma.examResult.upsert({
      where: {
        examId_studentId: { examId: data.examId, studentId: row.studentId },
      },
      update: {
        marksObtained: row.marksObtained,
        grade,
        percentage: Math.round(percentage * 100) / 100,
        isPassed,
        remarks: row.remarks ?? null,
        enteredBy,
        enteredAt: new Date(),
      },
      create: {
        examId: data.examId,
        studentId: row.studentId,
        marksObtained: row.marksObtained,
        grade,
        percentage: Math.round(percentage * 100) / 100,
        isPassed,
        remarks: row.remarks ?? null,
        enteredBy,
      },
    });
  });

  const results = await prisma.$transaction(upsertResults);
  logger.info(`Marks entered: exam=${data.examId}, count=${results.length}, by staff=${enteredBy}`);

  // Auto-calculate ranks after entry
  await calculateRanks(data.examId);

  return { saved: results.length, examId: data.examId };
}

// ─── Calculate Ranks ──────────────────────────────────────

export async function calculateRanks(examId: number) {
  const results = await prisma.examResult.findMany({
    where: { examId },
    orderBy: { marksObtained: 'desc' },
  });

  let rank = 0;
  let prevMarks = -1;
  let sameCount = 0;

  for (const r of results) {
    if (r.marksObtained !== prevMarks) {
      rank += 1 + sameCount;
      sameCount = 0;
    } else {
      sameCount++;
    }
    prevMarks = r.marksObtained;

    await prisma.examResult.update({
      where: { id: r.id },
      data: { rank },
    });
  }

  logger.info(`Ranks calculated: exam=${examId}, students=${results.length}`);
}

// ─── Publish / Unpublish Results ──────────────────────────

export async function publishResults(examId: number, publish: boolean) {
  const exam = await prisma.exam.update({
    where: { id: examId },
    data: { isResultPublished: publish },
  });
  logger.info(`Results ${publish ? 'published' : 'unpublished'}: exam=${examId}`);
  return exam;
}

// ─── Get Results by Exam ──────────────────────────────────

export async function getResultsByExam(examId: number, forceAccess = false) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      class: { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } },
    },
  });
  if (!exam) throw new Error('Exam not found');

  // Only return results if published or force access (admin/teacher)
  if (!exam.isResultPublished && !forceAccess) {
    return { exam, results: [], message: 'Results not yet published' };
  }

  const results = await prisma.examResult.findMany({
    where: { examId },
    include: {
      student: {
        select: {
          id: true,
          admissionNo: true,
          firstName: true,
          lastName: true,
          rollNo: true,
          section: true,
        },
      },
    },
    orderBy: { rank: 'asc' },
  });

  return { exam, results };
}

// ─── Get Rank List ────────────────────────────────────────

export async function getRankList(examId: number) {
  return getResultsByExam(examId, true);
}

// ─── Student Exam History ─────────────────────────────────

export async function getStudentExamHistory(studentId: number) {
  const results = await prisma.examResult.findMany({
    where: { studentId },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          examType: true,
          maxMarks: true,
          passingMarks: true,
          examDate: true,
          academicYear: true,
          isResultPublished: true,
          class: { select: { name: true, section: true } },
          subject: { select: { name: true, code: true } },
        },
      },
    },
    orderBy: [
      { exam: { academicYear: 'desc' } },
      { exam: { examDate: 'desc' } },
    ],
  });

  // Group by academic year
  const grouped: Record<string, typeof results> = {};
  for (const r of results) {
    const year = r.exam.academicYear;
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(r);
  }

  return {
    studentId,
    totalExams: results.length,
    history: grouped,
  };
}
