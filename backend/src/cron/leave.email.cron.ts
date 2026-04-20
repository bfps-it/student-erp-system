import cron from 'node-cron';

import logger from '../utils/logger';
import { fetchAndProcessLeaveEmails } from '../services/leave.imap.service';

/**
 * BFPS ERP - Leave Email IMAP Cron (Phase 4F)
 * Schedule: every 5 minutes — */5 * * * *
 * Fetches unread leave emails from leave@bfpsedu.in
 */

export function startLeaveEmailCron(): void {
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info('[Cron] Leave email check started');
      const processed = await fetchAndProcessLeaveEmails();
      if (processed > 0) {
        logger.info(`[Cron] Leave email check complete: ${processed} emails processed`);
      }
    } catch (error) {
      logger.error(`[Cron] Leave email check failed: ${(error as Error).message}`);
    }
  });

  logger.info('[Cron] Leave email cron registered: */5 * * * *');
}
