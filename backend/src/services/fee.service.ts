import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';

import { prisma } from '../config/database';
import logger from '../utils/logger';
import * as RazorpayService from './razorpay.service';
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
 * BFPS ERP - Fee Service (Phase 4D)
 * Fee structure management, payment collection, Razorpay integration,
 * partial payments, balance calculation, receipt PDF generation.
 */

// ─── Fee Structure CRUD ────────────────────────────────────

export async function createFeeStructure(data: CreateFeeStructureInput) {
  const structure = await prisma.feeStructure.create({
    data: {
      className: data.className,
      feeType: data.feeType,
      amount: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      academicYear: data.academicYear,
    },
  });
  logger.info(`Fee structure created: ${structure.className}/${structure.feeType} = ₹${structure.amount}`);
  return structure;
}

export async function updateFeeStructure(id: number, data: UpdateFeeStructureInput) {
  const updated = await prisma.feeStructure.update({
    where: { id },
    data: {
      ...(data.className && { className: data.className }),
      ...(data.feeType && { feeType: data.feeType }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      ...(data.academicYear && { academicYear: data.academicYear }),
    },
  });
  return updated;
}

export async function getFeeStructures(academicYear?: string) {
  return prisma.feeStructure.findMany({
    where: {
      isActive: true,
      ...(academicYear && { academicYear }),
    },
    orderBy: [{ className: 'asc' }, { feeType: 'asc' }],
  });
}

export async function deleteFeeStructure(id: number) {
  return prisma.feeStructure.update({
    where: { id },
    data: { isActive: false },
  });
}

// ─── Collect Fee Payment (Cash, Cheque, UPI, Bank Transfer) ─

export interface CollectResult {
  payment: {
    id: number;
    receiptNo: string;
    amount: number;
    paidAmount: number;
    status: string;
  };
  balance: number;
}

export async function collectFee(data: CollectFeeInput, collectedBy: number): Promise<CollectResult> {
  const effectiveAmount = data.amount - data.discount + data.fineAmount;
  const isPaid = data.paidAmount >= effectiveAmount;
  const isPartial = data.paidAmount > 0 && data.paidAmount < effectiveAmount;

  const payment = await prisma.feePayment.create({
    data: {
      studentId: data.studentId,
      feeType: data.feeType,
      amount: data.amount,
      paidAmount: data.paidAmount,
      discount: data.discount,
      fineAmount: data.fineAmount,
      status: isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'PENDING',
      paymentMethod: data.paymentMethod,
      academicYear: data.academicYear,
      collectedBy,
      notes: data.notes ?? null,
      chequeNo: data.chequeNo ?? null,
      chequeDate: data.chequeDate ? new Date(data.chequeDate) : null,
      transactionId: data.transactionId ?? null,
      paidAt: data.paidAmount > 0 ? new Date() : null,
    },
  });

  const balance = effectiveAmount - data.paidAmount;

  logger.info(
    `Fee collected: student=${data.studentId}, type=${data.feeType}, paid=₹${data.paidAmount}/${effectiveAmount}, status=${payment.status}`
  );

  return {
    payment: {
      id: payment.id,
      receiptNo: payment.receiptNo,
      amount: payment.amount,
      paidAmount: payment.paidAmount,
      status: payment.status,
    },
    balance: Math.max(0, balance),
  };
}

// ─── Razorpay Order Creation ──────────────────────────────

export async function createRazorpayOrder(data: CreateRazorpayOrderInput) {
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
    select: { firstName: true, lastName: true, admissionNo: true },
  });

  if (!student) throw new Error('Student not found');

  const payment = await prisma.feePayment.create({
    data: {
      studentId: data.studentId,
      feeType: data.feeType,
      amount: data.amount,
      paidAmount: 0,
      status: 'PENDING',
      paymentMethod: 'RAZORPAY',
      academicYear: data.academicYear,
    },
  });

  const order = await RazorpayService.createOrder({
    amountInPaise: Math.round(data.amount * 100),
    receiptId: payment.receiptNo,
    studentName: `${student.firstName} ${student.lastName} (${student.admissionNo})`,
    feeType: data.feeType,
    academicYear: data.academicYear,
  });

  if (!order) {
    await prisma.feePayment.delete({ where: { id: payment.id } });
    throw new Error('Razorpay service unavailable');
  }

  await prisma.feePayment.update({
    where: { id: payment.id },
    data: { razorpayOrderId: order.orderId },
  });

  return { ...order, receiptNo: payment.receiptNo, paymentId: payment.id };
}

// ─── Razorpay Webhook Verification ────────────────────────

export async function verifyRazorpayPayment(data: RazorpayWebhookInput) {
  const isValid = RazorpayService.verifySignature(
    data.razorpay_order_id,
    data.razorpay_payment_id,
    data.razorpay_signature
  );

  if (!isValid) {
    throw new Error('Invalid payment signature');
  }

  const payment = await prisma.feePayment.findFirst({
    where: { razorpayOrderId: data.razorpay_order_id },
  });

  if (!payment) {
    throw new Error('Payment record not found for this order');
  }

  const updated = await prisma.feePayment.update({
    where: { id: payment.id },
    data: {
      razorpayPaymentId: data.razorpay_payment_id,
      razorpaySignature: data.razorpay_signature,
      paidAmount: payment.amount,
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  logger.info(`Razorpay payment verified: order=${data.razorpay_order_id}, receipt=${updated.receiptNo}`);
  return updated;
}

// ─── Student Balance Calculation ──────────────────────────

export async function getStudentBalance(studentId: number, academicYear: string) {
  const payments = await prisma.feePayment.findMany({
    where: { studentId, academicYear },
  });

  let totalFees = 0;
  let totalPaid = 0;
  let totalDiscount = 0;
  let totalFine = 0;

  for (const p of payments) {
    totalFees += p.amount;
    totalPaid += p.paidAmount;
    totalDiscount += p.discount;
    totalFine += p.fineAmount;
  }

  const effectiveTotal = totalFees - totalDiscount + totalFine;
  const balance = effectiveTotal - totalPaid;

  return {
    studentId,
    academicYear,
    totalFees,
    totalDiscount,
    totalFine,
    effectiveTotal,
    totalPaid,
    balance: Math.max(0, balance),
    payments: payments.map((p) => ({
      id: p.id,
      receiptNo: p.receiptNo,
      feeType: p.feeType,
      amount: p.amount,
      paidAmount: p.paidAmount,
      discount: p.discount,
      fineAmount: p.fineAmount,
      status: p.status,
      paymentMethod: p.paymentMethod,
      paidAt: p.paidAt,
    })),
  };
}

// ─── Fee Reports ──────────────────────────────────────────

export async function getFeeReport(params: FeeReportQueryInput) {
  const filters: Prisma.FeePaymentWhereInput = {};

  if (params.academicYear) filters.academicYear = params.academicYear;
  if (params.status) filters.status = params.status;

  if (params.classId) {
    filters.student = {
      classId: params.classId,
      ...(params.section && { section: params.section }),
    };
  }

  if (params.month && params.year) {
    const start = new Date(params.year, params.month - 1, 1);
    const end = new Date(params.year, params.month, 0, 23, 59, 59);
    filters.paidAt = { gte: start, lte: end };
  }

  const payments = await prisma.feePayment.findMany({
    where: filters,
    include: {
      student: {
        select: {
          id: true,
          admissionNo: true,
          firstName: true,
          lastName: true,
          section: true,
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Aggregates
  let totalCollected = 0;
  let totalPending = 0;

  for (const p of payments) {
    if (p.status === 'PAID') totalCollected += p.paidAmount;
    else if (p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'OVERDUE') {
      totalPending += (p.amount - p.discount + p.fineAmount) - p.paidAmount;
    }
  }

  return { payments, totalCollected, totalPending, totalRecords: payments.length };
}

// ─── Defaulter List ───────────────────────────────────────

export async function getDefaulters(params: DefaulterQueryInput) {
  const filters: Prisma.FeePaymentWhereInput = {
    academicYear: params.academicYear,
    status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
  };

  if (params.feeType) filters.feeType = params.feeType;

  if (params.classId) {
    filters.student = {
      classId: params.classId,
      ...(params.section && { section: params.section }),
    };
  }

  const records = await prisma.feePayment.findMany({
    where: filters,
    include: {
      student: {
        select: {
          id: true,
          admissionNo: true,
          firstName: true,
          lastName: true,
          parentPhone: true,
          section: true,
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by student
  const studentMap = new Map<number, {
    student: typeof records[0]['student'];
    totalDue: number;
    totalPaid: number;
    balance: number;
    overdueItems: Array<{ feeType: string; amount: number; paidAmount: number; status: string }>;
  }>();

  for (const rec of records) {
    if (!studentMap.has(rec.studentId)) {
      studentMap.set(rec.studentId, { student: rec.student, totalDue: 0, totalPaid: 0, balance: 0, overdueItems: [] });
    }
    const entry = studentMap.get(rec.studentId)!;
    const due = rec.amount - rec.discount + rec.fineAmount;
    entry.totalDue += due;
    entry.totalPaid += rec.paidAmount;
    entry.balance += due - rec.paidAmount;
    entry.overdueItems.push({
      feeType: rec.feeType,
      amount: rec.amount,
      paidAmount: rec.paidAmount,
      status: rec.status,
    });
  }

  return Array.from(studentMap.values());
}

// ─── Receipt PDF Generation ───────────────────────────────

export function generateReceiptPdf(payment: {
  receiptNo: string;
  studentName: string;
  admissionNo: string;
  className: string;
  section: string;
  feeType: string;
  amount: number;
  paidAmount: number;
  discount: number;
  fineAmount: number;
  paymentMethod: string;
  paidAt: Date | null;
}): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ size: 'A5', margin: 40 });
  const pageW = doc.page.width;
  const contentW = pageW - 80;

  // Header
  doc.rect(0, 0, pageW, 70).fill('#1a365d');
  doc.fill('#ffffff');
  doc.fontSize(14).font('Helvetica-Bold').text('BABA FARID PUBLIC SCHOOL', 40, 15, { align: 'center', width: contentW });
  doc.fontSize(7).font('Helvetica').text('Kilianwali, Sri Muktsar Sahib, Punjab | ICSE & ISC | PU170', 40, 33, { align: 'center', width: contentW });
  doc.fontSize(10).font('Helvetica-Bold').text('FEE RECEIPT', 40, 50, { align: 'center', width: contentW });

  doc.fill('#000000');
  let y = 85;

  // Receipt details
  doc.fontSize(9).font('Helvetica-Bold').text(`Receipt No: ${payment.receiptNo}`, 40, y);
  doc.text(`Date: ${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-IN') : 'N/A'}`, 250, y, { width: 150, align: 'right' });
  y += 20;

  doc.font('Helvetica').fontSize(9);
  const details = [
    ['Student Name', payment.studentName],
    ['Admission No', payment.admissionNo],
    ['Class / Section', `${payment.className} - ${payment.section}`],
    ['Fee Type', payment.feeType],
    ['Amount', `₹ ${payment.amount.toLocaleString('en-IN')}`],
    ['Discount', `₹ ${payment.discount.toLocaleString('en-IN')}`],
    ['Fine', `₹ ${payment.fineAmount.toLocaleString('en-IN')}`],
    ['Net Amount', `₹ ${(payment.amount - payment.discount + payment.fineAmount).toLocaleString('en-IN')}`],
    ['Paid Amount', `₹ ${payment.paidAmount.toLocaleString('en-IN')}`],
    ['Payment Method', payment.paymentMethod],
  ];

  for (const [label, value] of details) {
    doc.font('Helvetica-Bold').text(`${label}:`, 40, y, { continued: true, width: 150 });
    doc.font('Helvetica').text(`  ${value}`, { width: 200 });
    y += 16;
  }

  const balance = (payment.amount - payment.discount + payment.fineAmount) - payment.paidAmount;
  if (balance > 0) {
    y += 5;
    doc.font('Helvetica-Bold').fillColor('#cc0000').text(`Balance Due: ₹ ${balance.toLocaleString('en-IN')}`, 40, y);
    doc.fillColor('#000000');
  }

  y += 30;
  doc.fontSize(7).fillColor('#666666');
  doc.text('This is a computer-generated receipt. No signature is required.', 40, y, { align: 'center', width: contentW });
  doc.text('Baba Farid Public School — bfpsedu.in', 40, y + 12, { align: 'center', width: contentW });

  return doc;
}

// ─── Reconciliation: Cross-check Razorpay vs DB ──────────

export async function reconcilePayments() {
  const pendingRazorpay = await prisma.feePayment.findMany({
    where: {
      paymentMethod: 'RAZORPAY',
      status: 'PENDING',
      razorpayOrderId: { not: null },
      createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // last 48hrs
    },
  });

  let reconciled = 0;

  for (const payment of pendingRazorpay) {
    if (!payment.razorpayOrderId) continue;

    const rzpPayments = await RazorpayService.fetchOrderPayments(payment.razorpayOrderId);

    if (Array.isArray(rzpPayments) && rzpPayments.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const captured = (rzpPayments as any[]).find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.status === 'captured'
      );

      if (captured) {
        await prisma.feePayment.update({
          where: { id: payment.id },
          data: {
            razorpayPaymentId: captured.id,
            paidAmount: payment.amount,
            status: 'PAID',
            paidAt: new Date(),
          },
        });
        reconciled++;
        logger.info(`Reconciled payment: receipt=${payment.receiptNo}, razorpayPayment=${captured.id}`);
      }
    }
  }

  return { totalChecked: pendingRazorpay.length, reconciled };
}
