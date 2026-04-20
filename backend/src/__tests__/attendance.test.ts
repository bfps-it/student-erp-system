/**
 * BFPS ERP - Attendance Module Tests (Phase 4C)
 * Tests: Validation, service logic, duplicate prevention, threshold alerts.
 * Uses mocked Prisma client.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { AttendanceStatus } from '@prisma/client';

// ─── Mock Prisma ───────────────────────────────────────────
const mockPrisma = {
  attendance: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  student: {
    findMany: jest.fn(),
  },
  class: {
    findMany: jest.fn(),
  },
};

jest.mock('../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../utils/logger', () => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn() };
  return { __esModule: true, default: logger };
});

jest.mock('twilio', () => {
  return jest.fn(() => null);
});

import * as AttendanceService from '../services/attendance.service';
import {
  markAttendanceSchema,
  monthlyReportSchema,
  thresholdAlertSchema,
  getAttendanceByDateSchema,
} from '../validators/attendance.validator';

// ─── Validator Tests ───────────────────────────────────────

describe('Attendance Validators', () => {
  describe('markAttendanceSchema', () => {
    it('should validate a correct attendance marking payload', () => {
      const input = {
        classId: 1,
        section: 'A',
        date: '2026-04-18',
        period: 1,
        records: [
          { studentId: 1, status: 'PRESENT' },
          { studentId: 2, status: 'ABSENT', note: 'Sick leave' },
        ],
      };
      const result = markAttendanceSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject payload with empty records', () => {
      const input = {
        classId: 1,
        section: 'A',
        date: '2026-04-18',
        period: 1,
        records: [],
      };
      const result = markAttendanceSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid date', () => {
      const input = {
        classId: 1,
        section: 'A',
        date: 'not-a-date',
        period: 1,
        records: [{ studentId: 1, status: 'PRESENT' }],
      };
      const result = markAttendanceSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject period > 8', () => {
      const input = {
        classId: 1,
        section: 'A',
        date: '2026-04-18',
        period: 10,
        records: [{ studentId: 1, status: 'PRESENT' }],
      };
      const result = markAttendanceSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid attendance status', () => {
      const input = {
        classId: 1,
        section: 'A',
        date: '2026-04-18',
        period: 1,
        records: [{ studentId: 1, status: 'ON_VACATION' }],
      };
      const result = markAttendanceSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('monthlyReportSchema', () => {
    it('should accept valid month and year', () => {
      const result = monthlyReportSchema.safeParse({
        classId: '1',
        section: 'A',
        month: '4',
        year: '2026',
      });
      expect(result.success).toBe(true);
    });

    it('should reject month > 12', () => {
      const result = monthlyReportSchema.safeParse({
        classId: '1',
        section: 'A',
        month: '13',
        year: '2026',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getAttendanceByDateSchema', () => {
    it('should accept valid query params', () => {
      const result = getAttendanceByDateSchema.safeParse({
        classId: '1',
        section: 'A',
        date: '2026-04-18',
        period: '3',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('thresholdAlertSchema', () => {
    it('should use default threshold of 75', () => {
      const result = thresholdAlertSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.threshold).toBe(75);
      }
    });
  });
});

// ─── Service Tests ─────────────────────────────────────────

describe('Attendance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markAttendance', () => {
    it('should create attendance records and return counts', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue(null); // no duplicates
      mockPrisma.attendance.create.mockResolvedValue({ id: 1 });

      const result = await AttendanceService.markAttendance(
        {
          classId: 1,
          section: 'A',
          date: '2026-04-18',
          period: 1,
          records: [
            { studentId: 1, status: AttendanceStatus.PRESENT },
            { studentId: 2, status: AttendanceStatus.PRESENT },
          ],
        },
        100 // markedBy staffId
      );

      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(result.duplicatesSkipped).toBe(0);
      expect(mockPrisma.attendance.create).toHaveBeenCalledTimes(2);
    });

    it('should skip duplicate records', async () => {
      // First call finds existing, second finds nothing
      mockPrisma.attendance.findUnique
        .mockResolvedValueOnce({ id: 99 }) // duplicate
        .mockResolvedValueOnce(null);      // new
      mockPrisma.attendance.create.mockResolvedValue({ id: 2 });

      const result = await AttendanceService.markAttendance(
        {
          classId: 1,
          section: 'A',
          date: '2026-04-18',
          period: 1,
          records: [
            { studentId: 1, status: AttendanceStatus.PRESENT },
            { studentId: 2, status: AttendanceStatus.PRESENT },
          ],
        },
        100
      );

      expect(result.duplicatesSkipped).toBe(1);
      expect(result.created).toBe(1);
    });

    it('should track absent students for WhatsApp', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue(null);
      mockPrisma.attendance.create.mockResolvedValue({ id: 1 });
      // Twilio is mocked as null, so no messages sent
      mockPrisma.student.findMany.mockResolvedValue([]);

      const result = await AttendanceService.markAttendance(
        {
          classId: 1,
          section: 'A',
          date: '2026-04-18',
          period: 3,
          records: [
            { studentId: 5, status: AttendanceStatus.ABSENT, note: 'Not in class' },
          ],
        },
        100
      );

      expect(result.created).toBe(1);
      // WhatsApp notifications = 0 because Twilio client is null
      expect(result.absentNotifications).toBe(0);
    });

    it('should handle database errors per record gracefully', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue(null);
      mockPrisma.attendance.create
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 1 });

      const result = await AttendanceService.markAttendance(
        {
          classId: 1,
          section: 'A',
          date: '2026-04-18',
          period: 1,
          records: [
            { studentId: 1, status: AttendanceStatus.PRESENT },
            { studentId: 2, status: AttendanceStatus.PRESENT },
          ],
        },
        100
      );

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.studentId).toBe(1);
    });
  });

  describe('getMonthlyReport', () => {
    it('should calculate percentage correctly', async () => {
      mockPrisma.student.findMany.mockResolvedValue([
        { id: 1, admissionNo: 'ADM-001', firstName: 'John', lastName: 'Doe', rollNo: 1 },
      ]);
      mockPrisma.attendance.findMany.mockResolvedValue([
        { status: 'PRESENT' },
        { status: 'PRESENT' },
        { status: 'ABSENT' },
        { status: 'LATE' },
      ]);

      const { report } = await AttendanceService.getMonthlyReport({
        classId: 1,
        section: 'A',
        month: 4,
        year: 2026,
      });

      expect(report).toHaveLength(1);
      const student = report[0]!;
      // 2 present + 1 late = 3 effective / 4 total = 75%
      expect(student.percentage).toBe(75);
      expect(student.belowThreshold).toBe(false);
    });

    it('should flag below-threshold students', async () => {
      mockPrisma.student.findMany.mockResolvedValue([
        { id: 1, admissionNo: 'ADM-001', firstName: 'Jane', lastName: 'Doe', rollNo: 1 },
      ]);
      mockPrisma.attendance.findMany.mockResolvedValue([
        { status: 'ABSENT' },
        { status: 'ABSENT' },
        { status: 'PRESENT' },
        { status: 'ABSENT' },
      ]);

      const { report } = await AttendanceService.getMonthlyReport(
        { classId: 1, section: 'A', month: 4, year: 2026 },
        75
      );

      expect(report[0]!.percentage).toBe(25);
      expect(report[0]!.belowThreshold).toBe(true);
    });

    it('should return 100% for students with no records', async () => {
      mockPrisma.student.findMany.mockResolvedValue([
        { id: 1, admissionNo: 'ADM-001', firstName: 'A', lastName: 'B', rollNo: 1 },
      ]);
      mockPrisma.attendance.findMany.mockResolvedValue([]);

      const { report } = await AttendanceService.getMonthlyReport({
        classId: 1,
        section: 'A',
        month: 4,
        year: 2026,
      });

      expect(report[0]!.percentage).toBe(100);
      expect(report[0]!.belowThreshold).toBe(false);
    });
  });

  describe('getAttendanceByDate', () => {
    it('should return records for the given date', async () => {
      const mockRecords = [
        { id: 1, studentId: 1, status: 'PRESENT', period: 1, student: { firstName: 'A', lastName: 'B' } },
      ];
      mockPrisma.attendance.findMany.mockResolvedValue(mockRecords);

      const records = await AttendanceService.getAttendanceByDate({
        classId: 1,
        section: 'A',
        date: '2026-04-18',
        period: 1,
      });

      expect(records).toEqual(mockRecords);
    });
  });

  describe('getDailyAbsentSummary', () => {
    it('should group absent records by student', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([
        {
          studentId: 1,
          period: 1,
          status: 'ABSENT',
          student: { admissionNo: 'ADM-001', firstName: 'X', lastName: 'Y', parentPhone: '9876543210', section: 'A' },
          class: { name: 'Class 5' },
        },
        {
          studentId: 1,
          period: 3,
          status: 'ABSENT',
          student: { admissionNo: 'ADM-001', firstName: 'X', lastName: 'Y', parentPhone: '9876543210', section: 'A' },
          class: { name: 'Class 5' },
        },
      ]);

      const result = await AttendanceService.getDailyAbsentSummary(new Date('2026-04-18'));
      expect(result).toHaveLength(1);
      expect(result[0]!.periods).toEqual([1, 3]);
    });
  });
});
