import { prisma } from '../config/database';
import logger from '../utils/logger';

/**
 * BFPS ERP - Leave Dedup Service (Phase 4F - Part 2)
 * Detects and merges duplicate leave requests.
 * Criteria: same staffId + overlapping date range + within 72 hours.
 */

const DEDUP_WINDOW_HOURS = 72;

interface DedupResult {
  isDuplicate: boolean;
  primaryTicketId: number | null;
}

export async function checkAndMergeDuplicate(
  staffId: number,
  fromDate: Date,
  toDate: Date,
  newTicketId: number
): Promise<DedupResult> {
  const cutoffDate = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000);

  // Find existing active tickets for the same staff with overlapping dates
  const existing = await prisma.leaveRequest.findFirst({
    where: {
      staffId,
      id: { not: newTicketId },
      isDuplicate: false,
      status: { in: ['PENDING_PRINCIPAL', 'PENDING_DIRECTOR'] },
      createdAt: { gte: cutoffDate },
      OR: [
        { fromDate: { lte: toDate }, toDate: { gte: fromDate } }, // Overlapping
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!existing) {
    return { isDuplicate: false, primaryTicketId: null };
  }

  // Mark new ticket as duplicate and link to primary
  await prisma.leaveRequest.update({
    where: { id: newTicketId },
    data: {
      isDuplicate: true,
      mergedIntoId: existing.id,
      status: 'CANCELLED',
    },
  });

  logger.info(
    `[Leave Dedup] Ticket #${newTicketId} merged into #${existing.id} (staff=${staffId}, dates overlap)`
  );

  return { isDuplicate: true, primaryTicketId: existing.id };
}
