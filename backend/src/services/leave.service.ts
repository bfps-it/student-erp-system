import { Prisma, LeaveSource } from '@prisma/client';

import { prisma } from '../config/database';
import logger from '../utils/logger';
import { checkAndMergeDuplicate } from './leave.dedup.service';
import { notifyPrincipal, notifyDirector, notifyStaffApproved, notifyStaffRejected } from './leave.notification.service';
import type { ApplyLeaveInput, LeaveQueryInput } from '../validators/leave.validator';

/**
 * BFPS ERP - Leave Service (Phase 4F - Part 2)
 * Core leave management: apply, approve/reject (2-level), cancel, stats.
 */

function calcTotalDays(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

// ─── Apply Leave ──────────────────────────────────────────

export async function applyLeave(data: ApplyLeaveInput, source: LeaveSource = 'APP') {
  const fromDate = new Date(data.fromDate);
  const toDate = new Date(data.toDate);

  if (toDate < fromDate) throw new Error('End date must be on or after start date');

  const ticket = await prisma.leaveRequest.create({
    data: {
      staffId: data.staffId,
      leaveType: data.leaveType,
      fromDate,
      toDate,
      totalDays: calcTotalDays(fromDate, toDate),
      reason: data.reason,
      source,
    },
    include: {
      staff: { select: { firstName: true, lastName: true } },
    },
  });

  // Dedup check
  const dedup = await checkAndMergeDuplicate(data.staffId, fromDate, toDate, ticket.id);

  if (!dedup.isDuplicate) {
    // Notify principal of new ticket
    await notifyPrincipal(
      ticket.ticketId,
      `${ticket.staff.firstName} ${ticket.staff.lastName}`,
      ticket.leaveType,
      data.fromDate,
      data.toDate
    );
  }

  logger.info(`Leave applied: ticket=${ticket.ticketId}, staff=${data.staffId}, type=${data.leaveType}, source=${source}, duplicate=${dedup.isDuplicate}`);

  return {
    ...ticket,
    isDuplicate: dedup.isDuplicate,
    mergedIntoId: dedup.primaryTicketId,
  };
}

// ─── Get Leaves (Filtered) ────────────────────────────────

export async function getLeaves(filters: LeaveQueryInput) {
  const where: Prisma.LeaveRequestWhereInput = { isDuplicate: false };
  if (filters.status) where.status = filters.status;
  if (filters.staffId) where.staffId = filters.staffId;
  if (filters.source) where.source = filters.source;
  if (filters.dateFrom || filters.dateTo) {
    where.fromDate = {};
    if (filters.dateFrom) where.fromDate.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.fromDate.lte = new Date(filters.dateTo);
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const [total, leaves] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        staff: { select: { firstName: true, lastName: true, department: true, employeeId: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { leaves, total, page, limit, pages: Math.ceil(total / limit) };
}

// ─── Get My Leaves ────────────────────────────────────────

export async function getMyLeaves(staffId: number) {
  return prisma.leaveRequest.findMany({
    where: { staffId },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Get Leave By ID ──────────────────────────────────────

export async function getLeaveById(id: number) {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      staff: { select: { firstName: true, lastName: true, department: true, employeeId: true, phone: true } },
      principal: { select: { firstName: true, lastName: true } },
      director: { select: { firstName: true, lastName: true } },
    },
  });
  if (!leave) throw new Error('Leave request not found');
  return leave;
}

// ─── Principal Action (Level 1) ───────────────────────────

export async function principalAction(leaveId: number, action: 'APPROVED' | 'REJECTED', principalId: number, note?: string) {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    include: { staff: { select: { firstName: true, lastName: true, phone: true, user: { select: { email: true } } } } },
  });

  if (!leave) throw new Error('Leave request not found');
  if (leave.status !== 'PENDING_PRINCIPAL') throw new Error('Can only act on PENDING_PRINCIPAL tickets');

  const newStatus = action === 'APPROVED' ? 'PENDING_DIRECTOR' : 'REJECTED';

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      principalId,
      principalAction: action,
      principalNote: note ?? null,
      principalAt: new Date(),
      status: newStatus,
    },
  });

  if (action === 'APPROVED') {
    await notifyDirector(leave.ticketId, `${leave.staff.firstName} ${leave.staff.lastName}`, leave.leaveType);
  } else {
    await notifyStaffRejected(
      { name: `${leave.staff.firstName} ${leave.staff.lastName}`, email: leave.staff.user.email, phone: leave.staff.phone },
      leave.ticketId, 'Principal', note || ''
    );
  }

  logger.info(`Principal ${action}: leave=${leaveId}, staff=${leave.staffId}`);
  return updated;
}

// ─── Director Action (Level 2) ────────────────────────────

export async function directorAction(leaveId: number, action: 'APPROVED' | 'REJECTED', directorId: number, note?: string) {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    include: { staff: { select: { firstName: true, lastName: true, phone: true, user: { select: { email: true } } } } },
  });

  if (!leave) throw new Error('Leave request not found');
  if (leave.status !== 'PENDING_DIRECTOR') throw new Error('Can only act on PENDING_DIRECTOR tickets');

  const updated = await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: {
      directorId,
      directorAction: action,
      directorNote: note ?? null,
      directorAt: new Date(),
      status: action,
    },
  });

  const contact = {
    name: `${leave.staff.firstName} ${leave.staff.lastName}`,
    email: leave.staff.user.email,
    phone: leave.staff.phone,
  };

  if (action === 'APPROVED') {
    await notifyStaffApproved(contact, leave.ticketId);
  } else {
    await notifyStaffRejected(contact, leave.ticketId, 'Director', note || '');
  }

  logger.info(`Director ${action}: leave=${leaveId}, staff=${leave.staffId}`);
  return updated;
}

// ─── Cancel Leave ─────────────────────────────────────────

export async function cancelLeave(leaveId: number, staffId: number) {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) throw new Error('Leave request not found');
  if (leave.staffId !== staffId) throw new Error('Can only cancel your own leave');
  if (leave.status !== 'PENDING_PRINCIPAL') throw new Error('Can only cancel PENDING_PRINCIPAL tickets');

  return prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: 'CANCELLED' },
  });
}

// ─── Leave Stats ──────────────────────────────────────────

export async function getLeaveStats() {
  const [pendingPrincipal, pendingDirector, approved, rejected] = await Promise.all([
    prisma.leaveRequest.count({ where: { status: 'PENDING_PRINCIPAL', isDuplicate: false } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING_DIRECTOR', isDuplicate: false } }),
    prisma.leaveRequest.count({ where: { status: 'APPROVED', isDuplicate: false } }),
    prisma.leaveRequest.count({ where: { status: 'REJECTED', isDuplicate: false } }),
  ]);

  return { pendingPrincipal, pendingDirector, approved, rejected };
}
