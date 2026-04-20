import { z } from 'zod';
import { Gender } from '@prisma/client';

/**
 * BFPS ERP - Staff Validators (Phase 4F - Part 1)
 */

export const createStaffSchema = z.object({
  userId: z.number().int().positive(),
  employeeId: z.string().min(2).max(20),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  dateOfBirth: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date').optional(),
  gender: z.nativeEnum(Gender),
  phone: z.string().min(10).max(15),
  altPhone: z.string().max(15).optional(),
  personalEmail: z.string().email().optional(),
  qualification: z.string().max(100).optional(),
  specialization: z.string().max(100).optional(),
  experience: z.string().max(50).optional(),
  department: z.string().min(1).max(50),
  designation: z.string().min(1).max(50),
  dateOfJoining: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  photoUrl: z.string().url().optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits').optional(),
  panNumber: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Invalid PAN format').optional(),
  bankAccountNumber: z.string().min(8).max(20).optional(),
  bankName: z.string().max(50).optional(),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC').optional(),
  salary: z.number().positive().optional(),
  showOnWebsite: z.boolean().optional(),
  websiteBio: z.string().max(500).optional(),
  websiteDisplayOrder: z.number().int().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  dateOfBirth: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date').optional(),
  gender: z.nativeEnum(Gender).optional(),
  phone: z.string().min(10).max(15).optional(),
  altPhone: z.string().max(15).optional(),
  personalEmail: z.string().email().optional(),
  qualification: z.string().max(100).optional(),
  specialization: z.string().max(100).optional(),
  experience: z.string().max(50).optional(),
  department: z.string().min(1).max(50).optional(),
  designation: z.string().min(1).max(50).optional(),
  dateOfJoining: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date').optional(),
  photoUrl: z.string().url().optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/).optional(),
  panNumber: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/).optional(),
  bankAccountNumber: z.string().min(8).max(20).optional(),
  bankName: z.string().max(50).optional(),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(),
  salary: z.number().positive().optional(),
  showOnWebsite: z.boolean().optional(),
  websiteBio: z.string().max(500).optional(),
  websiteDisplayOrder: z.number().int().optional(),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const staffQuerySchema = z.object({
  department: z.string().optional(),
  designation: z.string().optional(),
  showOnWebsite: z.enum(['true', 'false']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export type StaffQueryInput = z.infer<typeof staffQuerySchema>;
