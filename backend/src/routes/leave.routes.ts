import { Router } from 'express';

import {
  applyLeave, getLeaves, getMyLeaves, getLeaveStats,
  getLeaveById, principalAction, directorAction, cancelLeave,
} from '../controllers/leave.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { applyLeaveSchema } from '../validators/leave.validator';

const router = Router();

/**
 * BFPS ERP - Leave Routes (Phase 4F)
 * Paths: /api/v1/leaves/...
 */

router.use(authenticate);

router.post('/apply', validate(applyLeaveSchema), applyLeave);
router.get('/', getLeaves);
router.get('/my', getMyLeaves);
router.get('/stats', getLeaveStats);
router.get('/:id', getLeaveById);
router.put('/:id/principal-action', principalAction);
router.put('/:id/director-action', directorAction);
router.delete('/:id/cancel', cancelLeave);

export default router;
