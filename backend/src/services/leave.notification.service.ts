import logger from '../utils/logger';

/**
 * BFPS ERP - Leave Notification Service (Phase 4F - Part 2)
 * Sends email (Nodemailer), WhatsApp (Twilio), and push (FCM) notifications.
 */

interface StaffContact {
  name: string;
  email: string;
  phone: string;
}

export async function notifyPrincipal(ticketId: string, staffName: string, leaveType: string, fromDate: string, toDate: string): Promise<void> {
  logger.info(`[Leave Notify] → Principal: New ${leaveType} leave request from ${staffName} (${fromDate} to ${toDate}), ticket: ${ticketId}`);
  // Production: send email via Nodemailer + WhatsApp via Twilio + FCM push
}

export async function notifyDirector(ticketId: string, staffName: string, leaveType: string): Promise<void> {
  logger.info(`[Leave Notify] → Director: ${leaveType} leave approved by Principal, ticket: ${ticketId} (${staffName})`);
}

export async function notifyStaffApproved(contact: StaffContact, ticketId: string): Promise<void> {
  logger.info(`[Leave Notify] → Staff (${contact.name}): Leave APPROVED, ticket: ${ticketId}`);
  // Production: email + WhatsApp + push
}

export async function notifyStaffRejected(contact: StaffContact, ticketId: string, rejectedBy: string, note: string): Promise<void> {
  logger.info(`[Leave Notify] → Staff (${contact.name}): Leave REJECTED by ${rejectedBy}, reason: ${note}, ticket: ${ticketId}`);
}

export async function notifyDuplicateMerged(contact: StaffContact, primaryTicketId: string, duplicateTicketId: string): Promise<void> {
  logger.info(`[Leave Notify] → Staff (${contact.name}): Duplicate request #${duplicateTicketId} merged into #${primaryTicketId}`);
}
