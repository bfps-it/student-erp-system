import { Router } from 'express';
import { createStudent, getStudentById, getAllStudents, updateStudent } from '../controllers/student.controller';
import auth from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createStudentSchema, updateStudentSchema } from '../validators/student.validator';

const router = Router();

/**
 * BFPS ERP - Student Routes
 * Paths: /api/v1/students/...
 */

// All routes require authentication
router.use(auth());

// Admission / Create Student 
// Depending on business logic, this could be limited to MASTER_ADMIN and ADMIN
router.post(
  '/', // Must be an admin to admit a new student directly (bypass or specific RBAC could be applied)
  validate(createStudentSchema),
  createStudent
);

// Get all students (Read)
router.get(
  '/',
  getAllStudents
);

// Get student by ID
router.get(
  '/:id',
  getStudentById
);

// Update student by ID
router.put(
  '/:id',
  validate(updateStudentSchema),
  updateStudent
);

export default router;
