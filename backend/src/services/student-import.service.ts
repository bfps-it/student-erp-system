import * as xlsx from 'xlsx';
import { prisma } from '../config/database';
import { hashPassword } from './auth.service';

export interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Parses an Excel or CSV file buffer and imports Student records in bulk.
 */
export async function importStudentsFromBuffer(buffer: Buffer, _mimetype: string): Promise<ImportResult> {
  const result: ImportResult = { total: 0, successful: 0, failed: 0, errors: [] };
  
  let workbook;
  try {
    workbook = xlsx.read(buffer, { type: 'buffer' });
  } catch (err) {
    throw new Error('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('No sheets found in file.');
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) throw new Error(`Worksheet ${sheetName} not found.`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet);

  result.total = data.length;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const rowNumber = i + 2; // +1 for 0-index, +1 for header row
    
    try {
      if (!row.firstName || !row.email || !row.classId) {
        throw new Error('Missing required fields: firstName, email, or classId');
      }

      const existingUser = await prisma.user.findUnique({ where: { email: String(row.email) } });
      if (existingUser) {
        throw new Error(`Email ${String(row.email)} already exists`);
      }

      const admissionNo = row.admissionNo ? String(row.admissionNo) : `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const existingStudent = await prisma.student.findUnique({ where: { admissionNo } });
      if (existingStudent) {
        throw new Error(`Admission number ${admissionNo} already exists`);
      }

      const hashedPassword = await hashPassword('password123'); // Default generated password

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: String(row.email),
            passwordHash: hashedPassword,
            role: 'STUDENT',
            mustChangePassword: true,
          },
        });

        await tx.student.create({
          data: {
            userId: user.id,
            admissionNo,
            firstName: String(row.firstName),
            lastName: row.lastName ? String(row.lastName) : '',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : new Date('2010-01-01'),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
            gender: row.gender ? String(row.gender) as any : 'MALE',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
            bloodGroup: row.bloodGroup ? String(row.bloodGroup) as any : 'O_POSITIVE',
            religion: row.religion ? String(row.religion) : 'HINDU',
            category: row.category ? String(row.category) : 'General',
            nationality: row.nationality ? String(row.nationality) : 'Indian',
            classId: Number(row.classId),
            section: row.section ? String(row.section) : 'A',
            rollNo: row.rollNo ? Number(row.rollNo) : undefined,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            admissionDate: row.admissionDate ? new Date(row.admissionDate) : new Date(),
            fatherName: row.fatherName ? String(row.fatherName) : 'Unknown',
            motherName: row.motherName ? String(row.motherName) : 'Unknown',
            parentPhone: row.parentPhone ? String(row.parentPhone) : '0000000000',
            address: row.address ? String(row.address) : 'Unknown',
            city: row.city ? String(row.city) : 'Unknown',
            state: row.state ? String(row.state) : 'Punjab',
            pincode: row.pincode ? String(row.pincode) : '000000',
          },
        });
      });

      result.successful++;
    } catch (err: unknown) {
      result.failed++;
      result.errors.push({
        row: rowNumber,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
