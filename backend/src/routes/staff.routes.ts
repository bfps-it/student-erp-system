import { Router } from 'express';

import { createStaff, updateStaff, getStaff, getStaffById, deleteStaff, toggleWebsite, getWebsiteStaff } from '../controllers/staff.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createStaffSchema, updateStaffSchema } from '../validators/staff.validator';

const router = Router();

/**
 * BFPS ERP - Staff Routes (Phase 4F)
 * Paths: /api/v1/staff/...
 */

// Public endpoint (no auth) — must be BEFORE authenticate middleware
router.get('/website', getWebsiteStaff);

// All routes below require authentication
router.use(authenticate);

router.get('/', getStaff);
router.post('/', validate(createStaffSchema), createStaff);
router.get('/:id', getStaffById);
router.put('/:id', validate(updateStaffSchema), updateStaff);
router.delete('/:id', deleteStaff);
router.patch('/:id/website-toggle', toggleWebsite);

export default router;
