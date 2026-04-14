import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { hashPassword } from './auth.service';
import { encrypt } from '../utils/encryption';
import logger from '../utils/logger';
import type { CreateStudentInput, UpdateStudentInput } from '../validators/student.validator';

/**
 * BFPS ERP - Student Service
 * Handles: Admission, CRUD, status changes
 */

export async function createStudent(data: CreateStudentInput) {
  // Check if admission number or email exists
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    throw new Error('Email is already registered');
  }

  // Generate admission number if not provided
  // (In reality, we might auto-generate it if the field is optional, but schema requires it)
  // Assuming the user provides it, or we would auto-generate here. For now we use the one passed or generate a mock one.
  const admissionNo = `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const existingStudent = await prisma.student.findUnique({ where: { admissionNo } });
  if (existingStudent) {
    throw new Error('Admission number conflict');
  }

  // Create user
  const hashedPassword = await hashPassword(data.password);
  
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
    const aadhaarEncrypted = data.aadhaarNumber ? encrypt(data.aadhaarNumber) : null;
    
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
  return student;
}

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

  return student;
}

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

  return { students, total, skip, take };
}

export async function updateStudent(id: number, data: UpdateStudentInput) {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Student not found');
  }

  const aadhaarEncrypted = data.aadhaarNumber ? encrypt(data.aadhaarNumber) : undefined;
  
  const updated = await prisma.student.update({
    where: { id },
    data: {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
      aadhaarEncrypted: aadhaarEncrypted,
      aadhaarNumber: undefined, // remove raw property
    },
    include: {
      class: {
        select: { name: true, section: true }
      }
    }
  });

  logger.info(`Student updated successfully: ${updated.admissionNo}`);
  return updated;
}
