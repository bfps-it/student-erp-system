import { Prisma, AttendanceStatus } from '@prisma/client';
import { prisma } from '../config/database';
import logger from '../utils/logger';
import type { MarkAttendanceInput } from '../validators/attendance.validator';

/**
 * BFPS ERP - Attendance Service
 * Handles: Period-wise bulk marking, student history, class reports, stats
 * WhatsApp absent notification stub included (Twilio integration in Task 16)
 */

interface AttendanceRecord {
  id: number;
  studentId: number;
  classId: number;
  subjectId: number | null;
  date: Date;
  period: number;
  status: AttendanceStatus;
  markedBy: number;
  note: string | null;
  createdAt: Date;
}

interface AttendanceWithStudent extends AttendanceRecord {
  student: {
    id: number;
    firstName: string;
    lastName: string;
    admissionNo: string;
    rollNo: number | null;
    parentPhone: string;
  };
}

interface AttendanceStatsResult {
  studentId: number;
  firstName: string;
  lastName: string;
  admissionNo: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  excusedDays: number;
  percentage: number;
  isBelowThreshold: boolean;
}

/**
 * Mark attendance for an entire class in a single period (bulk upsert).
 * Uses Prisma transaction for atomicity.
 */
export async function markAttendance(
  data: MarkAttendanceInput,
  markedById: number
): Promise<{ marked: number; absentStudentIds: number[] }> {
  const attendanceDate = new Date(data.date);
  const absentStudentIds: number[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const upsertPromises = data.entries.map((entry) => {
      if (entry.status === 'ABSENT') {
        absentStudentIds.push(entry.studentId);
      }

      return tx.attendance.upsert({
        where: {
          studentId_date_period: {
            studentId: entry.studentId,
            date: attendanceDate,
            period: data.period,
          },
        },
        update: {
          status: entry.status,
          note: entry.note ?? null,
          markedBy: markedById,
          subjectId: data.subjectId ?? null,
        },
        create: {
          studentId: entry.studentId,
          classId: data.classId,
          subjectId: data.subjectId ?? null,
          date: attendanceDate,
          period: data.period,
          status: entry.status,
          markedBy: markedById,
          note: entry.note ?? null,
        },
      });
    });

    return Promise.all(upsertPromises);
  });

  logger.info(
    `Attendance marked: class=${data.classId}, date=${data.date}, period=${data.period}, entries=${result.length}, absent=${absentStudentIds.length}`
  );

  // Stub: Trigger WhatsApp notification for absent students
  // This will be connected to Twilio in Task 16 (Notification module)
  if (absentStudentIds.length > 0) {
    await notifyAbsentStudents(absentStudentIds, attendanceDate);
  }

  return { marked: result.length, absentStudentIds };
}

/**
 * Get attendance for a class on a given date, optionally filtered by period.
 */
export async function getClassAttendance(params: {
  classId: number;
  date?: string;
  period?: number;
}): Promise<AttendanceWithStudent[]> {
  const filters: Prisma.AttendanceWhereInput = {
    classId: params.classId,
  };

  if (params.date) {
    filters.date = new Date(params.date);
  }

  if (params.period) {
    filters.period = params.period;
  }

  const records = await prisma.attendance.findMany({
    where: filters,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNo: true,
          rollNo: true,
          parentPhone: true,
        },
      },
    },
    orderBy: [
      { student: { rollNo: 'asc' } },
      { period: 'asc' },
    ],
    take: 200, // FINAL_01: max 200 per request
  });

  return records as AttendanceWithStudent[];
}

/**
 * Get attendance history for a single student with optional date range filtering.
 */
export async function getStudentAttendance(params: {
  studentId: number;
  fromDate?: string;
  toDate?: string;
  skip?: number;
  take?: number;
}): Promise<{ records: AttendanceRecord[]; total: number }> {
  const { studentId, fromDate, toDate, skip = 0, take = 50 } = params;

  const filters: Prisma.AttendanceWhereInput = { studentId };

  if (fromDate || toDate) {
    filters.date = {};
    if (fromDate) {
      (filters.date as Prisma.DateTimeFilter).gte = new Date(fromDate);
    }
    if (toDate) {
      (filters.date as Prisma.DateTimeFilter).lte = new Date(toDate);
    }
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where: filters,
      skip,
      take,
      orderBy: [{ date: 'desc' }, { period: 'asc' }],
    }),
    prisma.attendance.count({ where: filters }),
  ]);

  return { records, total };
}

/**
 * Calculate attendance statistics for all students in a class for a given month/year.
 * Returns percentage and flags students below the 75% threshold (FINAL_01 requirement).
 */
export async function getAttendanceStats(params: {
  classId: number;
  month?: number;
  year?: number;
}): Promise<AttendanceStatsResult[]> {
  const { classId, month, year } = params;
  const currentYear = year ?? new Date().getFullYear();
  const currentMonth = month ?? new Date().getMonth() + 1;

  const startDate = new Date(currentYear, currentMonth - 1, 1);
  const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

  // Get all students in the class
  const students = await prisma.student.findMany({
    where: { classId, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNo: true,
    },
    orderBy: { firstName: 'asc' },
    take: 200,
  });

  // Get attendance records for the period
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      classId,
      date: { gte: startDate, lte: endDate },
      period: 1, // Use period 1 as the daily attendance indicator
    },
    select: {
      studentId: true,
      status: true,
    },
  });

  // Build a map: studentId -> status counts
  const statsMap = new Map<number, {
    present: number; absent: number; late: number;
    halfDay: number; excused: number; total: number;
  }>();

  for (const record of attendanceRecords) {
    const existing = statsMap.get(record.studentId) ?? {
      present: 0, absent: 0, late: 0, halfDay: 0, excused: 0, total: 0,
    };

    existing.total++;
    switch (record.status) {
      case 'PRESENT': existing.present++; break;
      case 'ABSENT': existing.absent++; break;
      case 'LATE': existing.late++; break;
      case 'HALF_DAY': existing.halfDay++; break;
      case 'EXCUSED': existing.excused++; break;
    }

    statsMap.set(record.studentId, existing);
  }

  const THRESHOLD = 75;

  return students.map((student) => {
    const stats = statsMap.get(student.id) ?? {
      present: 0, absent: 0, late: 0, halfDay: 0, excused: 0, total: 0,
    };

    const percentage = stats.total > 0
      ? Math.round(((stats.present + stats.late + stats.excused) / stats.total) * 100 * 100) / 100
      : 0;

    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      admissionNo: student.admissionNo,
      totalDays: stats.total,
      presentDays: stats.present,
      absentDays: stats.absent,
      lateDays: stats.late,
      halfDays: stats.halfDay,
      excusedDays: stats.excused,
      percentage,
      isBelowThreshold: percentage < THRESHOLD && stats.total > 0,
    };
  });
}

/**
 * Stub: WhatsApp notification for absent students.
 * Will be connected to Twilio Programmable Messaging in Task 16.
 */
async function notifyAbsentStudents(studentIds: number[], date: Date): Promise<void> {
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      parentPhone: true,
      class: { select: { name: true, section: true } },
    },
  });

  for (const student of students) {
    logger.info(
      `[STUB] WhatsApp absent notification queued: ${student.firstName} ${student.lastName} ` +
      `(${student.parentPhone}) - absent on ${date.toISOString().split('T')[0]} - ` +
      `Class: ${student.class.name}-${student.class.section}`
    );
    // TODO (Task 16): Replace with actual Twilio WhatsApp API call
    // await twilioService.sendWhatsApp(student.parentPhone, 'ABSENT_NOTIFICATION', { ... });
  }
}
