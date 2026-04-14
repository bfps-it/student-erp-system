import { Router } from 'express';
import {
  markAttendance,
  getClassAttendance,
  getStudentAttendance,
  getAttendanceStats,
} from '../controllers/attendance.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { markAttendanceSchema } from '../validators/attendance.validator';

const router = Router();

/**
 * BFPS ERP - Attendance Routes
 * Prefix: /api/v1/attendance
 * RBAC per FINAL_01 Section 4.2 permission matrix:
 *   Mark: MASTER_ADMIN, ADMIN, AC_COORDINATOR, TEACHER
 *   View: Above + DIRECTOR, PRINCIPAL, VICE_PRINCIPAL (teacher gets VIEW only)
 */

// All routes require authentication
router.use(authenticate);

// Mark attendance for a class (bulk)
router.post(
  '/mark',
  authorize('ADMIN', 'AC_COORDINATOR', 'TEACHER'),
  validate(markAttendanceSchema),
  markAttendance
);

// Get attendance for a class on a date
router.get(
  '/class/:classId',
  authorize('ADMIN', 'DIRECTOR', 'PRINCIPAL', 'VICE_PRINCIPAL', 'AC_COORDINATOR', 'TEACHER'),
  getClassAttendance
);

// Get attendance history for a single student
router.get(
  '/student/:studentId',
  authorize('ADMIN', 'DIRECTOR', 'PRINCIPAL', 'VICE_PRINCIPAL', 'AC_COORDINATOR', 'TEACHER'),
  getStudentAttendance
);

// Get attendance statistics for a class (monthly)
router.get(
  '/stats/:classId',
  authorize('ADMIN', 'DIRECTOR', 'PRINCIPAL', 'VICE_PRINCIPAL', 'AC_COORDINATOR', 'TEACHER'),
  getAttendanceStats
);

export default router;
