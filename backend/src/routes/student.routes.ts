import { Router } from 'express';
import { createStudent, getStudentById, getAllStudents, updateStudent } from '../controllers/student.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createStudentSchema, updateStudentSchema } from '../validators/student.validator';

const router = Router();

/**
 * BFPS ERP - Student Routes
 * Prefix: /api/v1/students
 * RBAC per FINAL_01 Section 4.2 permission matrix
 */

// All routes require authentication
router.use(authenticate);

// Admission / Create Student (MASTER_ADMIN, ADMIN, RECEPTION only)
router.post(
  '/',
  authorize('ADMIN', 'RECEPTION'),
  validate(createStudentSchema),
  createStudent
);

// Get all students (broad view access per permission matrix)
router.get(
  '/',
  authorize('ADMIN', 'DIRECTOR', 'PRINCIPAL', 'VICE_PRINCIPAL', 'AC_COORDINATOR', 'TEACHER', 'IT_DEPT', 'ACCOUNTS', 'RECEPTION'),
  getAllStudents
);

// Get student by ID
router.get(
  '/:id',
  authorize('ADMIN', 'DIRECTOR', 'PRINCIPAL', 'VICE_PRINCIPAL', 'AC_COORDINATOR', 'TEACHER', 'IT_DEPT', 'ACCOUNTS', 'RECEPTION'),
  getStudentById
);

// Update student by ID (MASTER_ADMIN, ADMIN, PRINCIPAL, VICE_PRINCIPAL, RECEPTION)
router.put(
  '/:id',
  authorize('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'RECEPTION'),
  validate(updateStudentSchema),
  updateStudent
);

export default router;
