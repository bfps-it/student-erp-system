import { Router } from 'express';

import {
  createFeeStructure,
  updateFeeStructure,
  getFeeStructures,
  deleteFeeStructure,
  collectFee,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getStudentBalance,
  getFeeReport,
  getDefaulters,
  downloadReceipt,
} from '../controllers/fee.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createFeeStructureSchema,
  updateFeeStructureSchema,
  collectFeeSchema,
  createRazorpayOrderSchema,
  razorpayWebhookSchema,
} from '../validators/fee.validator';

const router = Router();

/**
 * BFPS ERP - Fee Routes (Phase 4D)
 * Paths: /api/v1/fees/...
 */

// All routes require authentication
router.use(authenticate);

// ─── Fee Structure Management ─────────────────────────────
router.get('/structures', getFeeStructures);
router.post('/structures', validate(createFeeStructureSchema), createFeeStructure);
router.put('/structures/:id', validate(updateFeeStructureSchema), updateFeeStructure);
router.delete('/structures/:id', deleteFeeStructure);

// ─── Fee Collection ───────────────────────────────────────
router.post('/collect', validate(collectFeeSchema), collectFee);

// ─── Razorpay Integration ─────────────────────────────────
router.post('/razorpay/order', validate(createRazorpayOrderSchema), createRazorpayOrder);
router.post('/razorpay/verify', validate(razorpayWebhookSchema), verifyRazorpayPayment);

// ─── Student Balance ──────────────────────────────────────
router.get('/balance/:studentId', getStudentBalance);

// ─── Receipt PDF Download ─────────────────────────────────
router.get('/receipt/:paymentId', downloadReceipt);

// ─── Reports & Defaulters ─────────────────────────────────
router.get('/report', getFeeReport);
router.get('/defaulters', getDefaulters);

export default router;
