import { Prisma } from '@prisma/client';

import { prisma } from '../config/database';
import logger from '../utils/logger';
import { encryptAadhaar, encryptPAN, encryptBankAccount, decrypt } from '../utils/encryption';
import type { CreateStaffInput, UpdateStaffInput, StaffQueryInput } from '../validators/staff.validator';

/**
 * BFPS ERP - Staff Service (Phase 4F - Part 1)
 * Staff management with AES-256 encryption for sensitive fields.
 */

// ─── Sanitize Staff (mask sensitive fields) ───────────────

export function sanitizeStaff(staff: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...staff };

  // Replace encrypted fields with masked versions
  if (sanitized.aadhaarEncrypted) {
    try {
      const decrypted = decrypt(sanitized.aadhaarEncrypted as string);
      sanitized.aadhaarMasked = decrypted ? `XXXX-XXXX-${decrypted.slice(-4)}` : null;
    } catch {
      sanitized.aadhaarMasked = 'XXXX-XXXX-XXXX';
    }
  } else {
    sanitized.aadhaarMasked = null;
  }

  if (sanitized.panEncrypted) {
    try {
      const decrypted = decrypt(sanitized.panEncrypted as string);
      sanitized.panMasked = decrypted ? `XXXXX${decrypted.slice(-4)}X` : null;
    } catch {
      sanitized.panMasked = 'XXXXXXXXXX';
    }
  } else {
    sanitized.panMasked = null;
  }

  if (sanitized.bankAccountEncrypted) {
    try {
      const decrypted = decrypt(sanitized.bankAccountEncrypted as string);
      sanitized.bankAccountMasked = decrypted ? `XXXX${decrypted.slice(-4)}` : null;
    } catch {
      sanitized.bankAccountMasked = 'XXXXXXXX';
    }
  } else {
    sanitized.bankAccountMasked = null;
  }

  // Remove raw encrypted fields
  delete sanitized.aadhaarEncrypted;
  delete sanitized.panEncrypted;
  delete sanitized.bankAccountEncrypted;

  return sanitized;
}

// ─── Create Staff ─────────────────────────────────────────

export async function createStaff(data: CreateStaffInput) {
  const aadhaarData = encryptAadhaar(data.aadhaarNumber);
  const panData = encryptPAN(data.panNumber);
  const bankData = encryptBankAccount(data.bankAccountNumber);

  const staff = await prisma.staff.create({
    data: {
      userId: data.userId,
      employeeId: data.employeeId,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender,
      phone: data.phone,
      altPhone: data.altPhone ?? null,
      personalEmail: data.personalEmail ?? null,
      qualification: data.qualification ?? null,
      specialization: data.specialization ?? null,
      experience: data.experience ?? null,
      department: data.department,
      designation: data.designation,
      dateOfJoining: new Date(data.dateOfJoining),
      photoUrl: data.photoUrl ?? null,
      aadhaarEncrypted: aadhaarData.encrypted,
      panEncrypted: panData.encrypted,
      bankAccountEncrypted: bankData.encrypted,
      bankName: data.bankName ?? null,
      ifscCode: data.ifscCode ?? null,
      salary: data.salary ?? null,
      showOnWebsite: data.showOnWebsite ?? false,
      websiteBio: data.websiteBio ?? null,
      websiteDisplayOrder: data.websiteDisplayOrder ?? null,
    },
  });

  logger.info(`Staff created: ${staff.firstName} ${staff.lastName} (${staff.employeeId})`);
  return sanitizeStaff(staff as unknown as Record<string, unknown>);
}

// ─── Update Staff ─────────────────────────────────────────

export async function updateStaff(id: number, data: UpdateStaffInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};

  // Simple fields
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(data.dateOfBirth);
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.altPhone !== undefined) updateData.altPhone = data.altPhone;
  if (data.personalEmail !== undefined) updateData.personalEmail = data.personalEmail;
  if (data.qualification !== undefined) updateData.qualification = data.qualification;
  if (data.specialization !== undefined) updateData.specialization = data.specialization;
  if (data.experience !== undefined) updateData.experience = data.experience;
  if (data.department !== undefined) updateData.department = data.department;
  if (data.designation !== undefined) updateData.designation = data.designation;
  if (data.dateOfJoining !== undefined) updateData.dateOfJoining = new Date(data.dateOfJoining);
  if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;
  if (data.bankName !== undefined) updateData.bankName = data.bankName;
  if (data.ifscCode !== undefined) updateData.ifscCode = data.ifscCode;
  if (data.salary !== undefined) updateData.salary = data.salary;
  if (data.showOnWebsite !== undefined) updateData.showOnWebsite = data.showOnWebsite;
  if (data.websiteBio !== undefined) updateData.websiteBio = data.websiteBio;
  if (data.websiteDisplayOrder !== undefined) updateData.websiteDisplayOrder = data.websiteDisplayOrder;

  // Encrypted fields
  if (data.aadhaarNumber) updateData.aadhaarEncrypted = encryptAadhaar(data.aadhaarNumber).encrypted;
  if (data.panNumber) updateData.panEncrypted = encryptPAN(data.panNumber).encrypted;
  if (data.bankAccountNumber) updateData.bankAccountEncrypted = encryptBankAccount(data.bankAccountNumber).encrypted;

  const staff = await prisma.staff.update({ where: { id }, data: updateData });
  logger.info(`Staff updated: id=${id}`);
  return sanitizeStaff(staff as unknown as Record<string, unknown>);
}

// ─── Get Staff (Paginated + Filtered) ─────────────────────

export async function getStaff(filters: StaffQueryInput) {
  const where: Prisma.StaffWhereInput = {};
  if (filters.department) where.department = filters.department;
  if (filters.designation) where.designation = filters.designation;
  if (filters.showOnWebsite !== undefined) where.showOnWebsite = filters.showOnWebsite === 'true';
  if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true';

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const [total, staff] = await Promise.all([
    prisma.staff.count({ where }),
    prisma.staff.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { firstName: 'asc' },
      select: {
        id: true, employeeId: true, firstName: true, lastName: true,
        department: true, designation: true, phone: true, photoUrl: true,
        showOnWebsite: true, isActive: true, dateOfJoining: true,
        gender: true, qualification: true,
        // Exclude encrypted fields from list queries
      },
    }),
  ]);

  return { staff, total, page, limit, pages: Math.ceil(total / limit) };
}

// ─── Get Staff By ID (Masked) ─────────────────────────────

export async function getStaffById(id: number) {
  const staff = await prisma.staff.findUnique({ where: { id } });
  if (!staff) throw new Error('Staff not found');
  return sanitizeStaff(staff as unknown as Record<string, unknown>);
}

// ─── Delete Staff (Soft) ──────────────────────────────────

export async function deleteStaff(id: number) {
  const staff = await prisma.staff.update({
    where: { id },
    data: { isActive: false },
  });
  logger.info(`Staff soft-deleted: id=${id}`);
  return staff;
}

// ─── Toggle Website Visibility ────────────────────────────

export async function toggleWebsiteVisibility(id: number) {
  const current = await prisma.staff.findUnique({ where: { id }, select: { showOnWebsite: true } });
  if (!current) throw new Error('Staff not found');

  const staff = await prisma.staff.update({
    where: { id },
    data: { showOnWebsite: !current.showOnWebsite },
  });
  logger.info(`Staff website toggle: id=${id}, now=${staff.showOnWebsite}`);
  return staff;
}

// ─── Public Website Staff ─────────────────────────────────

export async function getWebsiteStaff() {
  return prisma.staff.findMany({
    where: { showOnWebsite: true, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      designation: true,
      department: true,
      websiteBio: true,
      photoUrl: true,
      websiteDisplayOrder: true,
    },
    orderBy: [{ websiteDisplayOrder: 'asc' }, { firstName: 'asc' }],
  });
}
