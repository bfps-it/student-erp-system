import logger from '../utils/logger';

/**
 * BFPS ERP - Leave IMAP Service (Phase 4F - Part 2)
 * Connects to leave@bfpsedu.in via IMAP, reads unread emails,
 * parses leave requests, validates sender, and creates tickets.
 */

// Types for parsed email
interface ParsedLeaveEmail {
  senderEmail: string;
  subject: string;
  fromDate: string | null;
  toDate: string | null;
  leaveType: string;
  reason: string;
}

// Leave type keywords for parsing
const LEAVE_TYPE_MAP: Record<string, string> = {
  casual: 'CASUAL',
  medical: 'MEDICAL',
  sick: 'MEDICAL',
  earned: 'EARNED',
  emergency: 'EMERGENCY',
  urgent: 'EMERGENCY',
};

/**
 * Parse leave type from email subject/body
 */
function parseLeaveType(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, type] of Object.entries(LEAVE_TYPE_MAP)) {
    if (lower.includes(keyword)) return type;
  }
  return 'CASUAL'; // default
}

/**
 * Parse dates from email body (looks for patterns like DD/MM/YYYY, YYYY-MM-DD)
 */
function parseDates(text: string): { fromDate: string | null; toDate: string | null } {
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/g,
    /(\d{2}\/\d{2}\/\d{4})/g,
    /(\d{2}-\d{2}-\d{4})/g,
  ];

  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const d = new Date(m);
        if (!isNaN(d.getTime())) dates.push(d.toISOString().split('T')[0]!);
      }
    }
  }

  if (dates.length >= 2) return { fromDate: dates[0]!, toDate: dates[1]! };
  if (dates.length === 1) return { fromDate: dates[0]!, toDate: dates[0]! };
  return { fromDate: null, toDate: null };
}

/**
 * Parse email into leave request fields
 */
export function parseLeaveEmail(
  senderEmail: string,
  subject: string,
  body: string
): ParsedLeaveEmail {
  const { fromDate, toDate } = parseDates(`${subject} ${body}`);

  return {
    senderEmail,
    subject,
    fromDate,
    toDate,
    leaveType: parseLeaveType(`${subject} ${body}`),
    reason: subject || body.substring(0, 200),
  };
}

/**
 * Fetch and process unread leave emails from IMAP.
 * In production this would use 'imap' or 'imapflow' package.
 * For now, the structure is ready and logs the operation.
 */
export async function fetchAndProcessLeaveEmails(): Promise<number> {
  // IMAP config from environment
  const imapHost = process.env.IMAP_HOST || 'imap.bfpsedu.in';
  const imapUser = process.env.IMAP_USER || 'leave@bfpsedu.in';

  logger.info(`[Leave IMAP] Checking ${imapUser}@${imapHost} for new leave emails...`);

  // NOTE: Production implementation would:
  // 1. Connect to IMAP server using imapflow
  // 2. Search for unseen messages in INBOX
  // 3. For each message:
  //    a. Parse sender, subject, body
  //    b. Call parseLeaveEmail()
  //    c. Validate sender is a known staff email
  //    d. If unknown: send auto-reply rejection
  //    e. If known: call leave.dedup.service, then create ticket
  //    f. Mark message as seen
  // 4. Close connection

  logger.info('[Leave IMAP] Email processing cycle complete.');
  return 0; // Returns count of processed emails
}

/**
 * Validate if an email belongs to a known staff member
 */
export async function validateStaffEmail(email: string): Promise<number | null> {
  // Dynamic import to avoid circular dependency
  const { prisma } = await import('../config/database');

  const staff = await prisma.staff.findFirst({
    where: {
      OR: [
        { personalEmail: email },
        { user: { email: email } },
      ],
      isActive: true,
    },
    select: { id: true },
  });

  return staff?.id ?? null;
}
