import Razorpay from 'razorpay';
import crypto from 'crypto';

import logger from '../utils/logger';

/**
 * BFPS ERP - Razorpay Service (Phase 4D)
 * Order creation, webhook signature verification, payment fetch.
 */

// ─── Razorpay Client ──────────────────────────────────────

function getRazorpayClient(): Razorpay | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId === 'rzp_test_xxxxxxxxxxxxx') return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// ─── Create Order ─────────────────────────────────────────

export interface RazorpayOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  notes: Record<string, string>;
}

export async function createOrder(params: {
  amountInPaise: number;
  receiptId: string;
  studentName: string;
  feeType: string;
  academicYear: string;
}): Promise<RazorpayOrderResult | null> {
  const client = getRazorpayClient();
  if (!client) {
    logger.warn('Razorpay not configured. Cannot create order.');
    return null;
  }

  const notes = {
    receipt: params.receiptId,
    student: params.studentName,
    feeType: params.feeType,
    academicYear: params.academicYear,
    school: 'BFPS',
  };

  const order = await client.orders.create({
    amount: params.amountInPaise,
    currency: 'INR',
    receipt: params.receiptId,
    notes,
  });

  logger.info(`Razorpay order created: ${order.id} for ₹${params.amountInPaise / 100}`);

  return {
    orderId: order.id,
    amount: params.amountInPaise,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID!,
    notes,
  };
}

// ─── Verify Payment Signature ─────────────────────────────

export function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const webhookSecret = process.env.RAZORPAY_KEY_SECRET;
  if (!webhookSecret) {
    logger.error('Razorpay key secret not configured for signature verification.');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  );

  if (!isValid) {
    logger.warn(`Razorpay signature mismatch for order ${orderId}`);
  }

  return isValid;
}

// ─── Fetch Payment Details ────────────────────────────────

export async function fetchPayment(paymentId: string) {
  const client = getRazorpayClient();
  if (!client) return null;

  try {
    const payment = await client.payments.fetch(paymentId);
    return payment;
  } catch (err) {
    logger.error(`Failed to fetch Razorpay payment ${paymentId}: ${(err as Error).message}`);
    return null;
  }
}

// ─── Fetch All Payments for Order ─────────────────────────

export async function fetchOrderPayments(orderId: string) {
  const client = getRazorpayClient();
  if (!client) return [];

  try {
    const payments = await client.orders.fetchPayments(orderId);
    return payments;
  } catch (err) {
    logger.error(`Failed to fetch payments for order ${orderId}: ${(err as Error).message}`);
    return [];
  }
}
