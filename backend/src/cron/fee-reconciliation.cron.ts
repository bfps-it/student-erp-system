import cron from 'node-cron';
import nodemailer from 'nodemailer';

import { reconcilePayments } from '../services/fee.service';
import logger from '../utils/logger';

/**
 * BFPS ERP - Fee Reconciliation Cron (Phase 4D)
 * Daily at 2:00 AM: cross-check Razorpay orders vs database.
 * Catches payments that were captured on Razorpay but not updated in DB
 * (e.g., webhook missed due to network issues).
 */

function getMailTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.bfpsedu.in',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER || 'noreply@bfpsedu.in',
      pass: process.env.SMTP_PASS || '',
    },
  });
}

async function runReconciliation(): Promise<void> {
  try {
    const result = await reconcilePayments();

    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    if (result.reconciled > 0) {
      // Send notification email to admin
      const transporter = getMailTransporter();
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@bfpsedu.in';

      await transporter.sendMail({
        from: `"BFPS ERP" <${process.env.SMTP_USER || 'noreply@bfpsedu.in'}>`,
        to: adminEmail,
        subject: `⚠️ Fee Reconciliation Alert — ${dateStr}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#1a365d;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;">
              <h2 style="margin:0;">⚠️ Fee Reconciliation Report</h2>
              <p style="margin:4px 0 0;font-size:13px;">${dateStr}</p>
            </div>
            <div style="padding:16px 24px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
              <p style="font-size:14px;color:#333;">
                <strong>${result.reconciled}</strong> payment(s) were reconciled from Razorpay
                out of <strong>${result.totalChecked}</strong> pending Razorpay orders checked.
              </p>
              <p style="font-size:12px;color:#666;margin-top:12px;">
                These payments were captured on Razorpay but had not been updated in the database.
                They have now been marked as PAID automatically.
              </p>
              <p style="font-size:11px;color:#999;margin-top:16px;">
                Automated report from BFPS ERP Fee Reconciliation System.
              </p>
            </div>
          </div>
        `,
      });

      logger.info(`[FEE-RECONCILE] Email sent to ${adminEmail}: ${result.reconciled} reconciled.`);
    }

    logger.info(
      `[FEE-RECONCILE] Completed: checked=${result.totalChecked}, reconciled=${result.reconciled}`
    );
  } catch (error) {
    logger.error(`[FEE-RECONCILE] Reconciliation failed: ${(error as Error).message}`);
  }
}

// ─── Schedule: Daily at 2:00 AM ───────────────────────────
export function startFeeReconciliationCron(): void {
  cron.schedule('0 2 * * *', () => {
    logger.info('[FEE-RECONCILE] Running daily Razorpay reconciliation...');
    void runReconciliation();
  });

  logger.info('[FEE-RECONCILE] Fee reconciliation cron scheduled: daily at 2:00 AM.');
}
