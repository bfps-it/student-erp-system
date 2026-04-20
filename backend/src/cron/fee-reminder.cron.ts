import cron from 'node-cron';
import twilio from 'twilio';

import { prisma } from '../config/database';
import logger from '../utils/logger';

/**
 * BFPS ERP - Fee Reminder Cron (Phase 4D)
 * WhatsApp reminders on 1st, 7th, 15th of each month to parents with pending fees.
 */

function getTwilioClient(): twilio.Twilio | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || sid === 'your-twilio-account-sid') return null;
  return twilio(sid, token);
}

async function sendFeeReminders(): Promise<void> {
  const client = getTwilioClient();
  if (!client) {
    logger.warn('[FEE-CRON] Twilio not configured. Skipping fee reminders.');
    return;
  }

  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  try {
    // Find all pending/partial/overdue payments that haven't had a reminder recently
    const pendingPayments = await prisma.feePayment.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        reminderSent: false,
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNo: true,
            parentPhone: true,
            section: true,
            class: { select: { name: true } },
          },
        },
      },
    });

    let sent = 0;

    for (const payment of pendingPayments) {
      const phone = payment.student.parentPhone;
      if (!phone || phone.length < 10) continue;

      const toNumber = `whatsapp:+91${phone.replace(/\D/g, '').slice(-10)}`;
      const balance = (payment.amount - payment.discount + payment.fineAmount) - payment.paidAmount;

      const message = [
        `💰 *BFPS Fee Reminder*`,
        ``,
        `Dear Parent,`,
        `This is a reminder for pending fee payment:`,
        ``,
        `Student: *${payment.student.firstName} ${payment.student.lastName}*`,
        `Adm No: ${payment.student.admissionNo}`,
        `Class: ${payment.student.class.name}-${payment.student.section}`,
        `Fee Type: ${payment.feeType}`,
        `Amount Due: *₹${balance.toLocaleString('en-IN')}*`,
        ``,
        `Please pay at the school office or use the online portal.`,
        `— Baba Farid Public School`,
      ].join('\n');

      try {
        await client.messages.create({ from: fromNumber, to: toNumber, body: message });
        sent++;

        // Mark reminder sent
        await prisma.feePayment.update({
          where: { id: payment.id },
          data: { reminderSent: true },
        });
      } catch (err) {
        logger.error(`[FEE-CRON] WhatsApp send failed for ${phone}: ${(err as Error).message}`);
      }
    }

    logger.info(`[FEE-CRON] Fee reminders sent: ${sent}/${pendingPayments.length}`);
  } catch (error) {
    logger.error(`[FEE-CRON] Fee reminder job failed: ${(error as Error).message}`);
  }
}

// ─── Schedule: 1st, 7th, 15th of every month at 10:00 AM ──
export function startFeeReminderCron(): void {
  cron.schedule('0 10 1,7,15 * *', () => {
    logger.info('[FEE-CRON] Running fee reminder job...');
    void sendFeeReminders();
  });

  logger.info('[FEE-CRON] Fee reminder cron scheduled: 1st, 7th, 15th of each month at 10:00 AM.');
}
