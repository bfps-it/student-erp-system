import { Router } from 'express';

import { 
  createStudent, 
  getStudentById, 
  getAllStudents, 
  updateStudent,
  importStudents,
  generateIdCard,
  getStudentJourney,
  exportStudentJourneyPdf
} from '../controllers/student.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload } from '../middleware/upload';
import { createStudentSchema, updateStudentSchema } from '../validators/student.validator';

const router = Router();

/**
 * BFPS ERP - Student Routes
 * Paths: /api/v1/students/...
 */

// All routes require authentication
router.use(authenticate);

// Admission / Create Student 
router.post(
  '/',
  validate(createStudentSchema),
  createStudent
);

// Get all students (Read)
router.get(
  '/',
  getAllStudents
);

// Bulk import students via CSV/Excel
router.post(
  '/import',
  upload.single('file'),
  importStudents
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

// Download Student ID Card PDF
router.get(
  '/:id/id-card',
  generateIdCard
);

// Academic Journey Tracker (JSON)
router.get(
  '/:id/journey',
  getStudentJourney
);

// Academic Journey Tracker (PDF export with school letterhead)
router.get(
  '/:id/journey/pdf',
  exportStudentJourneyPdf
);

export default router;
