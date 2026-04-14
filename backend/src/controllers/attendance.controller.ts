import { Response, NextFunction } from 'express';
import * as AttendanceService from '../services/attendance.service';
import type { AuthRequest } from '../types';
import type { MarkAttendanceInput } from '../validators/attendance.validator';

/**
 * BFPS ERP - Attendance Controller
 * Handles HTTP layer for attendance marking, querying, and statistics.
 */

/**
 * POST /api/v1/attendance/mark
 * Mark attendance for a class (bulk operation).
 */
export const markAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = req.body as MarkAttendanceInput;
    const markedById = req.user!.id;

    const result = await AttendanceService.markAttendance(data, markedById);

    res.status(201).json({
      success: true,
      data: {
        marked: result.marked,
        absentCount: result.absentStudentIds.length,
        message: `Attendance marked for ${result.marked} students. ${result.absentStudentIds.length} absent notifications queued.`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/attendance/class/:classId
 * Get attendance for a class on a given date, optionally filtered by period.
 */
export const getClassAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const { date, period } = req.query;

    const records = await AttendanceService.getClassAttendance({
      classId,
      date: date as string | undefined,
      period: period ? parseInt(period as string, 10) : undefined,
    });

    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/attendance/student/:studentId
 * Get attendance history for a student with optional date range.
 */
export const getStudentAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);
    const { fromDate, toDate, skip, take } = req.query;

    const result = await AttendanceService.getStudentAttendance({
      studentId,
      fromDate: fromDate as string | undefined,
      toDate: toDate as string | undefined,
      skip: skip ? parseInt(skip as string, 10) : undefined,
      take: take ? parseInt(take as string, 10) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/attendance/stats/:classId
 * Get attendance statistics (percentages, threshold alerts) for a class.
 */
export const getAttendanceStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const classId = parseInt(req.params.classId, 10);
    const { month, year } = req.query;

    const stats = await AttendanceService.getAttendanceStats({
      classId,
      month: month ? parseInt(month as string, 10) : undefined,
      year: year ? parseInt(year as string, 10) : undefined,
    });

    const belowThreshold = stats.filter((s) => s.isBelowThreshold);

    res.status(200).json({
      success: true,
      data: {
        stats,
        summary: {
          totalStudents: stats.length,
          belowThresholdCount: belowThreshold.length,
          belowThresholdStudents: belowThreshold.map((s) => ({
            studentId: s.studentId,
            name: `${s.firstName} ${s.lastName}`,
            percentage: s.percentage,
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
