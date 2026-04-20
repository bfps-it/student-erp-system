import { Prisma } from '@prisma/client';
import twilio from 'twilio';

import { prisma } from '../config/database';
import logger from '../utils/logger';
import type { MarkAttendanceInput, MonthlyReportInput, ThresholdAlertInput } from '../validators/attendance.validator';

/**
 * BFPS ERP - Attendance Service (Phase 4C)
 * Period-wise marking, duplicate prevention, WhatsApp Twilio trigger,
 * monthly percentage calculation, threshold alerts.
 */

// ─── Twilio WhatsApp Client ────────────────────────────────

function getTwilioClient(): twilio.Twilio | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || sid === 'your-twilio-account-sid') return null;
  return twilio(sid, token);
}

// ─── Mark Attendance (Bulk, period-wise) ───────────────────

export interface MarkResult {
  total: number;
  created: number;
  duplicatesSkipped: number;
  absentNotifications: number;
  errors: Array<{ studentId: number; error: string }>;
}

export async function markAttendance(
  data: MarkAttendanceInput,
  markedBy: number
): Promise<MarkResult> {
  const result: MarkResult = {
    total: data.records.length,
    created: 0,
    duplicatesSkipped: 0,
    absentNotifications: 0,
    errors: [],
  };

  const dateObj = new Date(data.date);
  const absentStudentIds: number[] = [];

  for (const record of data.records) {
    try {
      // Duplicate prevention: check unique constraint [studentId, date, period]
      const existing = await prisma.attendance.findUnique({
        where: {
          studentId_date_period: {
            studentId: record.studentId,
            date: dateObj,
            period: data.period,
          },
        },
      });

      if (existing) {
        result.duplicatesSkipped++;
        continue;
      }

      await prisma.attendance.create({
        data: {
          studentId: record.studentId,
          classId: data.classId,
          subjectId: data.subjectId ?? null,
          date: dateObj,
          period: data.period,
          status: record.status,
          markedBy,
          note: record.note ?? null,
        },
      });

      result.created++;

      if (record.status === 'ABSENT') {
        absentStudentIds.push(record.studentId);
      }
    } catch (err: unknown) {
      result.errors.push({
        studentId: record.studentId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Trigger WhatsApp notifications for absent students
  if (absentStudentIds.length > 0) {
    result.absentNotifications = await sendAbsentWhatsApp(absentStudentIds, data.date, data.period);
  }

  logger.info(
    `Attendance marked: class=${data.classId}, section=${data.section}, date=${data.date}, period=${data.period}, created=${result.created}, skipped=${result.duplicatesSkipped}`
  );

  return result;
}

// ─── WhatsApp Notification for Absent Students ─────────────

async function sendAbsentWhatsApp(
  studentIds: number[],
  date: string,
  period: number
): Promise<number> {
  const client = getTwilioClient();
  if (!client) {
    logger.warn('Twilio not configured. Skipping WhatsApp notifications.');
    return 0;
  }

  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  let sent = 0;

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      firstName: true,
      lastName: true,
      parentPhone: true,
      class: { select: { name: true } },
      section: true,
    },
  });

  for (const student of students) {
    if (!student.parentPhone || student.parentPhone.length < 10) continue;

    const phone = `whatsapp:+91${student.parentPhone.replace(/\D/g, '').slice(-10)}`;
    const message = [
      `🔔 *BFPS Attendance Alert*`,
      ``,
      `Dear Parent,`,
      `Your ward *${student.firstName} ${student.lastName}* (Class ${student.class.name}-${student.section}) was marked *ABSENT* on ${date} (Period ${period}).`,
      ``,
      `If this is incorrect, please contact the school office.`,
      `— Baba Farid Public School`,
    ].join('\n');

    try {
      await client.messages.create({ from: fromNumber, to: phone, body: message });
      sent++;
    } catch (err) {
      logger.error(`WhatsApp send failed for ${student.parentPhone}: ${(err as Error).message}`);
    }
  }

  logger.info(`WhatsApp absence notifications sent: ${sent}/${students.length}`);
  return sent;
}

// ─── Get Attendance by Date ────────────────────────────────

export async function getAttendanceByDate(params: {
  classId: number;
  section: string;
  date: string;
  period?: number;
}) {
  const dateObj = new Date(params.date);

  const filters: Prisma.AttendanceWhereInput = {
    classId: params.classId,
    date: dateObj,
    student: { section: params.section },
  };

  if (params.period) filters.period = params.period;

  const records = await prisma.attendance.findMany({
    where: filters,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          rollNo: true,
          admissionNo: true,
          section: true,
        },
      },
      subject: { select: { name: true, code: true } },
    },
    orderBy: [{ period: 'asc' }, { student: { rollNo: 'asc' } }],
  });

  return records;
}

// ─── Monthly Percentage Report ─────────────────────────────

export interface MonthlyStudentReport {
  studentId: number;
  admissionNo: string;
  firstName: string;
  lastName: string;
  rollNo: number | null;
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  excused: number;
  percentage: number;
  belowThreshold: boolean;
}

export async function getMonthlyReport(
  params: MonthlyReportInput,
  threshold = 75
): Promise<{ report: MonthlyStudentReport[]; month: number; year: number; classId: number; section: string }> {
  const startDate = new Date(params.year, params.month - 1, 1);
  const endDate = new Date(params.year, params.month, 0, 23, 59, 59);

  // Get all students in this class/section
  const students = await prisma.student.findMany({
    where: { classId: params.classId, section: params.section, isActive: true },
    select: { id: true, admissionNo: true, firstName: true, lastName: true, rollNo: true },
    orderBy: { rollNo: 'asc' },
  });

  const report: MonthlyStudentReport[] = [];

  for (const student of students) {
    const records = await prisma.attendance.findMany({
      where: {
        studentId: student.id,
        date: { gte: startDate, lte: endDate },
      },
    });

    const totals = { present: 0, absent: 0, late: 0, halfDay: 0, excused: 0 };
    for (const r of records) {
      if (r.status === 'PRESENT') totals.present++;
      else if (r.status === 'ABSENT') totals.absent++;
      else if (r.status === 'LATE') totals.late++;
      else if (r.status === 'HALF_DAY') totals.halfDay++;
      else if (r.status === 'EXCUSED') totals.excused++;
    }

    const total = records.length;
    const effectivePresent = totals.present + totals.late + totals.halfDay * 0.5;
    const percentage = total > 0 ? Math.round((effectivePresent / total) * 10000) / 100 : 100;

    report.push({
      studentId: student.id,
      admissionNo: student.admissionNo,
      firstName: student.firstName,
      lastName: student.lastName,
      rollNo: student.rollNo,
      totalRecords: total,
      ...totals,
      percentage,
      belowThreshold: percentage < threshold,
    });
  }

  return { report, month: params.month, year: params.year, classId: params.classId, section: params.section };
}

// ─── Threshold Alert List ──────────────────────────────────

export async function getThresholdAlerts(params: ThresholdAlertInput) {
  const now = new Date();
  const month = params.month ?? (now.getMonth() + 1);
  const year = params.year ?? now.getFullYear();
  const threshold = params.threshold ?? 75;

  // If classId is specified, filter by it; otherwise, get all classes
  const classes = params.classId
    ? await prisma.class.findMany({ where: { id: params.classId, isActive: true } })
    : await prisma.class.findMany({ where: { isActive: true } });

  const alerts: MonthlyStudentReport[] = [];

  for (const cls of classes) {
    const { report } = await getMonthlyReport(
      { classId: cls.id, section: cls.section, month, year },
      threshold
    );
    alerts.push(...report.filter((r) => r.belowThreshold));
  }

  return { alerts, threshold, month, year };
}

// ─── Daily Absent Summary (for cron) ───────────────────────

export async function getDailyAbsentSummary(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const absentRecords = await prisma.attendance.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
      status: 'ABSENT',
    },
    include: {
      student: {
        select: {
          admissionNo: true,
          firstName: true,
          lastName: true,
          parentPhone: true,
          section: true,
        },
      },
      class: { select: { name: true } },
    },
    orderBy: [{ classId: 'asc' }, { period: 'asc' }],
  });

  // Group by student
  const grouped = new Map<number, { student: typeof absentRecords[0]['student']; className: string; periods: number[] }>();
  for (const rec of absentRecords) {
    if (!grouped.has(rec.studentId)) {
      grouped.set(rec.studentId, { student: rec.student, className: rec.class.name, periods: [] });
    }
    grouped.get(rec.studentId)!.periods.push(rec.period);
  }

  return Array.from(grouped.values());
}
