import cron from 'node-cron';
import nodemailer from 'nodemailer';

import { getDailyAbsentSummary } from '../services/attendance.service';
import logger from '../utils/logger';

/**
 * BFPS ERP - Attendance Report Cron (Phase 4C)
 * Runs daily at 6:00 PM IST and emails absent student summary to admin.
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

async function sendDailyAbsentReport(): Promise<void> {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  try {
    const summary = await getDailyAbsentSummary(today);

    if (summary.length === 0) {
      logger.info(`[CRON] No absentees recorded on ${dateStr}. Skipping email.`);
      return;
    }

    // Build HTML table
    const rows = summary
      .map(
        (s) =>
          `<tr>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;">${s.student.admissionNo}</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;">${s.student.firstName} ${s.student.lastName}</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;">${s.className}-${s.student.section}</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;">${s.periods.join(', ')}</td>
            <td style="padding:6px 10px;border:1px solid #e2e8f0;">${s.student.parentPhone}</td>
          </tr>`
      )
      .join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
        <div style="background:#1a365d;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;">🔔 BFPS Daily Absence Report</h2>
          <p style="margin:4px 0 0;font-size:13px;">${dateStr}</p>
        </div>
        <div style="padding:16px 24px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:14px;color:#333;">
            <strong>${summary.length}</strong> student(s) were marked absent today.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
            <thead>
              <tr style="background:#f7fafc;">
                <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:left;">Adm No</th>
                <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:left;">Name</th>
                <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:left;">Class</th>
                <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:left;">Absent Periods</th>
                <th style="padding:8px 10px;border:1px solid #e2e8f0;text-align:left;">Parent Phone</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <p style="font-size:11px;color:#999;margin-top:16px;">
            This is an automated report from BFPS ERP. WhatsApp alerts have already been sent to listed parents.
          </p>
        </div>
      </div>
    `;

    const transporter = getMailTransporter();
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || 'admin@bfpsedu.in';

    await transporter.sendMail({
      from: `"BFPS ERP" <${process.env.SMTP_USER || 'noreply@bfpsedu.in'}>`,
      to: adminEmail,
      subject: `📋 Daily Absence Report — ${dateStr} (${summary.length} absent)`,
      html,
    });

    logger.info(`[CRON] Daily absent report emailed to ${adminEmail}: ${summary.length} absentees.`);
  } catch (error) {
    logger.error(`[CRON] Failed to send daily absent report: ${(error as Error).message}`);
  }
}

// ─── Schedule: Every day at 6:00 PM IST (12:30 UTC) ───────
export function startAttendanceCron(): void {
  // "0 18 * * *" = 6:00 PM server local time
  // Server should be configured for IST timezone.
  cron.schedule('0 18 * * *', () => {
    logger.info('[CRON] Running daily attendance absent report...');
    void sendDailyAbsentReport();
  });

  logger.info('[CRON] Attendance daily report cron scheduled at 6:00 PM daily.');
}
