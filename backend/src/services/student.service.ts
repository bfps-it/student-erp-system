import { Prisma } from '@prisma/client';

import { prisma } from '../config/database';
import { encryptAadhaar, decrypt, maskValue } from '../utils/encryption';
import logger from '../utils/logger';
import type { CreateStudentInput, UpdateStudentInput } from '../validators/student.validator';

import { hashPassword } from './auth.service';

/**
 * BFPS ERP - Student Service
 * Handles: Admission, CRUD, status changes
 * 
 * SECURITY: aadhaarEncrypted is AES-256 encrypted via encryption.ts.
 * It is NEVER returned raw in any API response.
 * All responses use sanitizeStudent() to strip ciphertext and return masked format.
 */

// ─── Response Sanitization ────────────────────────────────

/**
 * Strips aadhaarEncrypted from a student record and replaces it with aadhaarMasked.
 * This ensures the raw ciphertext never leaves the backend.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeStudent(student: any): any {
  if (!student) return student;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { aadhaarEncrypted, ...rest } = student;

  let aadhaarMasked: string | null = null;
  if (aadhaarEncrypted) {
    try {
      const decrypted = decrypt(aadhaarEncrypted as string);
      aadhaarMasked = maskValue(decrypted);
    } catch {
      aadhaarMasked = null; // Decryption failed; do not expose anything
    }
  }

  return { ...rest, aadhaarMasked };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripAadhaar(student: any): any {
  if (!student) return student;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { aadhaarEncrypted, ...rest } = student;
  return rest;
}

// ─── Create Student ────────────────────────────────────────

export async function createStudent(data: CreateStudentInput) {
  // Check if email exists
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    throw new Error('Email is already registered');
  }

  // Generate admission number
  const admissionNo = `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const existingStudent = await prisma.student.findUnique({ where: { admissionNo } });
  if (existingStudent) {
    throw new Error('Admission number conflict');
  }

  // Create user
  const hashedPassword = await hashPassword(data.password);

  // Encrypt Aadhaar with validation via encryptAadhaar()
  const { encrypted: aadhaarEncrypted } = encryptAadhaar(data.aadhaarNumber);
  
  const student = await prisma.$transaction(async (tx) => {
    // Create the User corresponding to the student
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        role: 'STUDENT',
        mustChangePassword: true,
      },
    });

    // Create the Student record
    return tx.student.create({
      data: {
        userId: user.id,
        admissionNo,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        religion: data.religion,
        category: data.category,
        nationality: data.nationality,
        aadhaarEncrypted,
        classId: data.classId,
        section: data.section,
        rollNo: data.rollNo,
        stream: data.stream,
        previousSchool: data.previousSchool,
        admissionDate: new Date(data.admissionDate),
        photoUrl: data.photoUrl,
        fatherName: data.fatherName,
        motherName: data.motherName,
        guardianName: data.guardianName,
        parentPhone: data.parentPhone,
        parentAltPhone: data.parentAltPhone,
        parentEmail: data.parentEmail,
        parentOccupation: data.parentOccupation,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        tcNumber: data.tcNumber,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          }
        },
        class: {
          select: {
            name: true,
            section: true,
          }
        }
      }
    });
  });

  logger.info(`Student registered successfully: ${student.admissionNo} (${student.firstName})`);
  return sanitizeStudent(student);
}

// ─── Get Student by ID ─────────────────────────────────────

export async function getStudentById(id: number) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
          lockedUntil: true,
        }
      },
      class: true,
    }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Return sanitized (aadhaarMasked instead of aadhaarEncrypted)
  return sanitizeStudent(student);
}

// ─── Get All Students ──────────────────────────────────────

export async function getAllStudents(params: {
  skip?: number;
  take?: number;
  classId?: number;
  section?: string;
  isActive?: boolean;
}) {
  const { skip = 0, take = 50, classId, section, isActive } = params;

  const filters: Prisma.StudentWhereInput = {};
  if (classId !== undefined) filters.classId = classId;
  if (section !== undefined) filters.section = section;
  if (isActive !== undefined) filters.isActive = isActive;

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where: filters,
      skip,
      take,
      include: {
        class: {
          select: { name: true, section: true }
        }
      },
      orderBy: { firstName: 'asc' }
    }),
    prisma.student.count({ where: filters })
  ]);

  // Strip aadhaarEncrypted from list view (no need for masked display in list)
  return { students: students.map(stripAadhaar), total, skip, take };
}

// ─── Update Student ────────────────────────────────────────

export async function updateStudent(id: number, data: UpdateStudentInput) {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Student not found');
  }

  // Encrypt Aadhaar with validation via encryptAadhaar()
  const aadhaarEncrypted = data.aadhaarNumber
    ? encryptAadhaar(data.aadhaarNumber).encrypted
    : undefined;
  
  const updated = await prisma.student.update({
    where: { id },
    data: {
      ...(({ aadhaarNumber, ...rest }) => rest)(data),
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
      aadhaarEncrypted: aadhaarEncrypted,
    },
    include: {
      class: {
        select: { name: true, section: true }
      }
    }
  });

  logger.info(`Student updated successfully: ${updated.admissionNo}`);
  return sanitizeStudent(updated);
}
