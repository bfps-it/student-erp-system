import { Request, Response, NextFunction } from 'express';
import * as StudentService from '../services/student.service';
import type { CreateStudentInput, UpdateStudentInput } from '../validators/student.validator';

/**
 * BFPS ERP - Student Controller
 */

export const createStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body as CreateStudentInput;
    const student = await StudentService.createStudent(data);
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    if (error instanceof Error && error.message === 'Email is already registered') {
      res.status(409).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getStudentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const student = await StudentService.getStudentById(parseInt(id, 10));
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    if (error instanceof Error && error.message === 'Student not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getAllStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { skip, take, classId, section, isActive } = req.query;
    
    const params = {
      skip: skip ? parseInt(skip as string, 10) : undefined,
      take: take ? parseInt(take as string, 10) : undefined,
      classId: classId ? parseInt(classId as string, 10) : undefined,
      section: section as string | undefined,
      isActive: isActive ? isActive === 'true' : undefined,
    };

    const result = await StudentService.getAllStudents(params);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = req.body as UpdateStudentInput;
    const student = await StudentService.updateStudent(parseInt(id, 10), data);
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    if (error instanceof Error && error.message === 'Student not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};
