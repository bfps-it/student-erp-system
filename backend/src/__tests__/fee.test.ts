/**
 * BFPS ERP - Fee Module Tests (Phase 4D)
 * Covers validators and service logic.
 */

import {
  createFeeStructureSchema,
  collectFeeSchema,
  createRazorpayOrderSchema,
  razorpayWebhookSchema,
  feeReportQuerySchema,
  defaulterQuerySchema,
} from '../validators/fee.validator';

// ─── Mock Prisma ───────────────────────────────────────────

const mockPrisma = {
  feeStructure: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  feePayment: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  student: {
    findUnique: jest.fn(),
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

jest.mock('../services/razorpay.service', () => ({
  createOrder: jest.fn(),
  verifySignature: jest.fn(),
  fetchPayment: jest.fn(),
  fetchOrderPayments: jest.fn(),
}));

// ============================================================
// VALIDATOR TESTS
// ============================================================

describe('Fee Validators', () => {
  describe('createFeeStructureSchema', () => {
    it('should validate a correct fee structure', () => {
      const result = createFeeStructureSchema.safeParse({
        className: 'Class 5',
        feeType: 'Tuition',
        amount: 15000,
        academicYear: '2025-2026',
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative amount', () => {
      const result = createFeeStructureSchema.safeParse({
        className: 'Class 5',
        feeType: 'Tuition',
        amount: -100,
        academicYear: '2025-2026',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid academic year format', () => {
      const result = createFeeStructureSchema.safeParse({
        className: 'Class 5',
        feeType: 'Tuition',
        amount: 15000,
        academicYear: '2025',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('collectFeeSchema', () => {
    it('should validate a correct fee collection', () => {
      const result = collectFeeSchema.safeParse({
        studentId: 1,
        feeType: 'Tuition',
        amount: 15000,
        paidAmount: 15000,
        discount: 0,
        fineAmount: 0,
        paymentMethod: 'CASH',
        academicYear: '2025-2026',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid payment method', () => {
      const result = collectFeeSchema.safeParse({
        studentId: 1,
        feeType: 'Tuition',
        amount: 15000,
        paidAmount: 15000,
        paymentMethod: 'BITCOIN',
        academicYear: '2025-2026',
      });
      expect(result.success).toBe(false);
    });

    it('should accept partial payment', () => {
      const result = collectFeeSchema.safeParse({
        studentId: 1,
        feeType: 'Tuition',
        amount: 15000,
        paidAmount: 5000,
        discount: 0,
        fineAmount: 0,
        paymentMethod: 'UPI',
        academicYear: '2025-2026',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createRazorpayOrderSchema', () => {
    it('should validate a correct Razorpay order request', () => {
      const result = createRazorpayOrderSchema.safeParse({
        studentId: 1,
        feeType: 'Tuition',
        amount: 15000,
        academicYear: '2025-2026',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('razorpayWebhookSchema', () => {
    it('should validate a correct webhook payload', () => {
      const result = razorpayWebhookSchema.safeParse({
        razorpay_order_id: 'order_abc123',
        razorpay_payment_id: 'pay_xyz456',
        razorpay_signature: 'sig_hash',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing signature', () => {
      const result = razorpayWebhookSchema.safeParse({
        razorpay_order_id: 'order_abc123',
        razorpay_payment_id: 'pay_xyz456',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('feeReportQuerySchema', () => {
    it('should accept valid report filters', () => {
      const result = feeReportQuerySchema.safeParse({
        academicYear: '2025-2026',
        status: 'PAID',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty query (all optional)', () => {
      const result = feeReportQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('defaulterQuerySchema', () => {
    it('should validate a correct defaulter query', () => {
      const result = defaulterQuerySchema.safeParse({
        academicYear: '2025-2026',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing academic year', () => {
      const result = defaulterQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================
// SERVICE TESTS
// ============================================================

import * as FeeService from '../services/fee.service';
import * as RazorpayService from '../services/razorpay.service';

describe('Fee Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createFeeStructure', () => {
    it('should create a fee structure record', async () => {
      const mockStructure = { id: 1, className: 'Class 5', feeType: 'Tuition', amount: 15000, academicYear: '2025-2026' };
      mockPrisma.feeStructure.create.mockResolvedValue(mockStructure);

      const result = await FeeService.createFeeStructure({
        className: 'Class 5',
        feeType: 'Tuition',
        amount: 15000,
        academicYear: '2025-2026',
      });

      expect(result).toEqual(mockStructure);
      expect(mockPrisma.feeStructure.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('collectFee', () => {
    it('should create PAID payment when full amount is paid', async () => {
      const mockPayment = {
        id: 1, receiptNo: 'REC001', amount: 15000, paidAmount: 15000,
        discount: 0, fineAmount: 0, status: 'PAID',
      };
      mockPrisma.feePayment.create.mockResolvedValue(mockPayment);

      const result = await FeeService.collectFee({
        studentId: 1,
        feeType: 'Tuition',
        amount: 15000,
        paidAmount: 15000,
        discount: 0,
        fineAmount: 0,
        paymentMethod: 'CASH',
        academicYear: '2025-2026',
      }, 1);

      expect(result.payment.status).toBe('PAID');
      expect(result.balance).toBe(0);
    });

    it('should create PARTIAL payment when partial amount is paid', async () => {
      const mockPayment = {
        id: 2, receiptNo: 'REC002', amount: 15000, paidAmount: 5000,
        discount: 0, fineAmount: 0, status: 'PARTIAL',
      };
      mockPrisma.feePayment.create.mockResolvedValue(mockPayment);

      const result = await FeeService.collectFee({
        studentId: 1,
        feeType: 'Tuition',
        amount: 15000,
        paidAmount: 5000,
        discount: 0,
        fineAmount: 0,
        paymentMethod: 'UPI',
        academicYear: '2025-2026',
      }, 1);

      expect(result.payment.status).toBe('PARTIAL');
      expect(result.balance).toBe(10000);
    });

    it('should account for discount and fine in balance', async () => {
      const mockPayment = {
        id: 3, receiptNo: 'REC003', amount: 15000, paidAmount: 14000,
        discount: 1000, fineAmount: 500, status: 'PARTIAL',
      };
      mockPrisma.feePayment.create.mockResolvedValue(mockPayment);

      // effective = 15000 - 1000 + 500 = 14500, paid = 14000, balance = 500
      const result = await FeeService.collectFee({
        studentId: 1,
        feeType: 'Tuition',
        amount: 15000,
        paidAmount: 14000,
        discount: 1000,
        fineAmount: 500,
        paymentMethod: 'BANK_TRANSFER',
        academicYear: '2025-2026',
      }, 1);

      expect(result.balance).toBe(500);
    });
  });

  describe('getStudentBalance', () => {
    it('should calculate correct balance across multiple payments', async () => {
      mockPrisma.feePayment.findMany.mockResolvedValue([
        { amount: 10000, paidAmount: 10000, discount: 0, fineAmount: 0 },
        { amount: 5000, paidAmount: 2000, discount: 500, fineAmount: 100 },
      ]);

      const result = await FeeService.getStudentBalance(1, '2025-2026');

      expect(result.totalFees).toBe(15000);
      expect(result.totalPaid).toBe(12000);
      expect(result.totalDiscount).toBe(500);
      expect(result.totalFine).toBe(100);
      // effective = 15000 - 500 + 100 = 14600, balance = 14600 - 12000 = 2600
      expect(result.balance).toBe(2600);
    });

    it('should return zero balance when fully paid', async () => {
      mockPrisma.feePayment.findMany.mockResolvedValue([
        { amount: 15000, paidAmount: 15000, discount: 0, fineAmount: 0 },
      ]);

      const result = await FeeService.getStudentBalance(1, '2025-2026');
      expect(result.balance).toBe(0);
    });
  });

  describe('verifyRazorpayPayment', () => {
    it('should update payment to PAID on valid signature', async () => {
      (RazorpayService.verifySignature as jest.Mock).mockReturnValue(true);
      mockPrisma.feePayment.findFirst.mockResolvedValue({ id: 1, amount: 15000 });
      mockPrisma.feePayment.update.mockResolvedValue({
        id: 1, receiptNo: 'REC001', status: 'PAID', paidAmount: 15000,
      });

      const result = await FeeService.verifyRazorpayPayment({
        razorpay_order_id: 'order_abc',
        razorpay_payment_id: 'pay_xyz',
        razorpay_signature: 'valid_sig',
      });

      expect(result.status).toBe('PAID');
    });

    it('should throw on invalid signature', async () => {
      (RazorpayService.verifySignature as jest.Mock).mockReturnValue(false);

      await expect(
        FeeService.verifyRazorpayPayment({
          razorpay_order_id: 'order_abc',
          razorpay_payment_id: 'pay_xyz',
          razorpay_signature: 'bad_sig',
        })
      ).rejects.toThrow('Invalid payment signature');
    });
  });

  describe('reconcilePayments', () => {
    it('should reconcile captured payments from Razorpay', async () => {
      mockPrisma.feePayment.findMany.mockResolvedValue([
        { id: 1, razorpayOrderId: 'order_1', receiptNo: 'REC001', amount: 10000 },
      ]);
      (RazorpayService.fetchOrderPayments as jest.Mock).mockResolvedValue([
        { id: 'pay_1', status: 'captured' },
      ]);
      mockPrisma.feePayment.update.mockResolvedValue({});

      const result = await FeeService.reconcilePayments();

      expect(result.totalChecked).toBe(1);
      expect(result.reconciled).toBe(1);
    });

    it('should skip orders without captured payments', async () => {
      mockPrisma.feePayment.findMany.mockResolvedValue([
        { id: 1, razorpayOrderId: 'order_1', receiptNo: 'REC001', amount: 10000 },
      ]);
      (RazorpayService.fetchOrderPayments as jest.Mock).mockResolvedValue([
        { id: 'pay_1', status: 'created' },
      ]);

      const result = await FeeService.reconcilePayments();

      expect(result.totalChecked).toBe(1);
      expect(result.reconciled).toBe(0);
    });
  });
});
