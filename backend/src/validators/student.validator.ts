import { z } from 'zod';
import { Gender, BloodGroup, Stream } from '@prisma/client';

/**
 * BFPS ERP - Student Validation Schemas (Zod, TypeScript)
 */

export const createStudentSchema = z.object({
  firstName: z
    .string({ required_error: 'First name is required' })
    .min(2, 'First name must be at least 2 characters')
    .max(100)
    .trim(),
  lastName: z
    .string({ required_error: 'Last name is required' })
    .max(100)
    .trim(),
  dateOfBirth: z.string({ required_error: 'Date of birth is required' }).refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format (must be ISO string or valid YYYY-MM-DD)',
  }),
  gender: z.nativeEnum(Gender, { required_error: 'Gender is required' }),
  bloodGroup: z.nativeEnum(BloodGroup).optional(),
  religion: z.string().optional(),
  category: z.string().optional(),
  nationality: z.string().default('Indian'),
  aadhaarNumber: z
    .string()
    .length(12, 'Aadhaar must be exactly 12 digits')
    .regex(/^\d{12}$/, 'Aadhaar must be numeric')
    .optional(),
  classId: z.number({ required_error: 'Class ID is required' }).int().positive(),
  section: z
    .string({ required_error: 'Section is required' })
    .length(1, 'Section must be 1 character')
    .toUpperCase(),
  rollNo: z.number().int().positive().optional(),
  stream: z.nativeEnum(Stream).default(Stream.NONE),
  previousSchool: z.string().optional(),
  admissionDate: z.string({ required_error: 'Admission date is required' }).refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  photoUrl: z.string().url('Invalid photo URL').optional(),
  fatherName: z
    .string({ required_error: 'Father name is required' })
    .min(2, 'Father name must be at least 2 characters')
    .trim(),
  motherName: z.string().trim().optional(),
  guardianName: z.string().trim().optional(),
  parentPhone: z
    .string({ required_error: 'Parent phone number is required' })
    .length(10, 'Phone must be 10 digits')
    .regex(/^\d{10}$/, 'Phone must be numeric'),
  parentAltPhone: z
    .string()
    .length(10, 'Alternate phone must be 10 digits')
    .regex(/^\d{10}$/, 'Alternate phone must be numeric')
    .optional(),
  parentEmail: z.string().email('Invalid parent email').toLowerCase().optional(),
  parentOccupation: z.string().optional(),
  address: z.string({ required_error: 'Address is required' }).min(5, 'Address is too short'),
  city: z.string({ required_error: 'City is required' }),
  state: z.string().default('Punjab'),
  pincode: z
    .string({ required_error: 'Pincode is required' })
    .length(6, 'Pincode must be 6 digits')
    .regex(/^\d{6}$/, 'Pincode must be numeric'),
  tcNumber: z.string().optional(),
  
  // Credentials for the User account
  email: z
    .string({ required_error: 'Student email is required for login' })
    .email('Invalid student email')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Initial password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
});

export const updateStudentSchema = createStudentSchema.partial().omit({ email: true, password: true });

export const importStudentsSchema = z.object({
  students: z.array(createStudentSchema).min(1, 'At least one student must be provided'),
});

// Infer TypeScript types from Zod schemas
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ImportStudentsInput = z.infer<typeof importStudentsSchema>;
