import { Request, Response, NextFunction } from 'express';

import * as FeeService from '../services/fee.service';
import type {
  CreateFeeStructureInput,
  UpdateFeeStructureInput,
  CollectFeeInput,
  CreateRazorpayOrderInput,
  RazorpayWebhookInput,
  FeeReportQueryInput,
  DefaulterQueryInput,
} from '../validators/fee.validator';

/**
 * BFPS ERP - Fee Controller (Phase 4D)
 */

// ─── Fee Structure ─────────────────────────────────────────

export const createFeeStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as CreateFeeStructureInput;
    const structure = await FeeService.createFeeStructure(data);
    res.status(201).json({ success: true, data: structure });
  } catch (error) {
    next(error);
  }
};

export const updateFeeStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const data = req.body as UpdateFeeStructureInput;
    const updated = await FeeService.updateFeeStructure(id, data);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const getFeeStructures = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const academicYear = req.query.academicYear as string | undefined;
    const structures = await FeeService.getFeeStructures(academicYear);
    res.status(200).json({ success: true, data: structures });
  } catch (error) {
    next(error);
  }
};

export const deleteFeeStructure = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await FeeService.deleteFeeStructure(id);
    res.status(200).json({ success: true, message: 'Fee structure deactivated' });
  } catch (error) {
    next(error);
  }
};

// ─── Fee Collection ───────────────────────────────────────

export const collectFee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as CollectFeeInput;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const collectedBy = (req as any).user?.id ?? 0;
    const result = await FeeService.collectFee(data, collectedBy);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ─── Razorpay ─────────────────────────────────────────────

export const createRazorpayOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as CreateRazorpayOrderInput;
    const order = await FeeService.createRazorpayOrder(data);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const verifyRazorpayPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as RazorpayWebhookInput;
    const payment = await FeeService.verifyRazorpayPayment(data);
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

// ─── Student Balance ──────────────────────────────────────

export const getStudentBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = parseInt(req.params.studentId as string, 10);
    const academicYear = req.query.academicYear as string;
    const balance = await FeeService.getStudentBalance(studentId, academicYear);
    res.status(200).json({ success: true, data: balance });
  } catch (error) {
    next(error);
  }
};

// ─── Reports ──────────────────────────────────────────────

export const getFeeReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = req.query as unknown as FeeReportQueryInput;
    const report = await FeeService.getFeeReport(params);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// ─── Defaulters ───────────────────────────────────────────

export const getDefaulters = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = req.query as unknown as DefaulterQueryInput;
    const defaulters = await FeeService.getDefaulters(params);
    res.status(200).json({ success: true, data: defaulters });
  } catch (error) {
    next(error);
  }
};

// ─── Receipt PDF ──────────────────────────────────────────

export const downloadReceipt = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const paymentId = parseInt(req.params.paymentId as string, 10);
    const payment = await prismaFetchPayment(paymentId);
    if (!payment) { res.status(404).json({ success: false, error: 'Payment not found' }); return; }

    const doc = FeeService.generateReceiptPdf({
      receiptNo: payment.receiptNo,
      studentName: `${payment.student.firstName} ${payment.student.lastName}`,
      admissionNo: payment.student.admissionNo,
      className: payment.student.class.name,
      section: payment.student.section,
      feeType: payment.feeType,
      amount: payment.amount,
      paidAmount: payment.paidAmount,
      discount: payment.discount,
      fineAmount: payment.fineAmount,
      paymentMethod: payment.paymentMethod ?? 'N/A',
      paidAt: payment.paidAt,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt_${payment.receiptNo}.pdf"`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    next(error);
  }
};

// Helper to fetch payment with student details
import { prisma } from '../config/database';

async function prismaFetchPayment(paymentId: number) {
  return prisma.feePayment.findUnique({
    where: { id: paymentId },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          admissionNo: true,
          section: true,
          class: { select: { name: true } },
        },
      },
    },
  });
}
