import { Router } from 'express';

import {
  markAttendance,
  getAttendanceByDate,
  getMonthlyReport,
  getThresholdAlerts,
  exportReportPdf,
  exportReportXlsx,
  exportReportCsv,
} from '../controllers/attendance.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { markAttendanceSchema } from '../validators/attendance.validator';

const router = Router();

/**
 * BFPS ERP - Attendance Routes (Phase 4C)
 * Paths: /api/v1/attendance/...
 */

// All routes require authentication
router.use(authenticate);

// Mark attendance (bulk, period-wise)
router.post(
  '/mark',
  validate(markAttendanceSchema),
  markAttendance
);

// Get attendance records by date (query params: classId, section, date, period?)
router.get('/by-date', getAttendanceByDate);

// Monthly report (query params: classId, section, month, year)
router.get('/monthly-report', getMonthlyReport);

// Threshold alerts — students below 75% (query params: classId?, threshold?, month?, year?)
router.get('/threshold-alerts', getThresholdAlerts);

// Export endpoints
router.get('/export/pdf', exportReportPdf);
router.get('/export/xlsx', exportReportXlsx);
router.get('/export/csv', exportReportCsv);

export default router;
