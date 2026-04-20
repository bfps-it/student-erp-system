import { Request, Response, NextFunction } from 'express';

import * as StudentService from '../services/student.service';
import { importStudentsFromBuffer } from '../services/student-import.service';
import { generateIdCardPdfStream } from '../services/id-card.service';
import { getJourneyData, generateJourneyPdf } from '../services/student-journey.service';
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
    const student = await StudentService.getStudentById(parseInt(id as string, 10));
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
    const student = await StudentService.updateStudent(parseInt(id as string, 10), data);
    res.status(200).json({ success: true, data: student });
  } catch (error) {
    if (error instanceof Error && error.message === 'Student not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const importStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    const result = await importStudentsFromBuffer(req.file.buffer, req.file.mimetype);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const generateIdCard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await generateIdCardPdfStream(parseInt(id as string, 10));
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="id_card_${id}.pdf"`);
    
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    doc.pipe(res);
  } catch (error) {
    if (error instanceof Error && error.message === 'Student not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

// ─── Academic Journey Tracker ──────────────────────────────

export const getStudentJourney = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const journey = await getJourneyData(parseInt(id as string, 10));
    res.status(200).json({ success: true, data: journey });
  } catch (error) {
    if (error instanceof Error && error.message === 'Student not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const exportStudentJourneyPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await generateJourneyPdf(parseInt(id as string, 10));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="journey_${id}.pdf"`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    doc.pipe(res);
  } catch (error) {
    if (error instanceof Error && error.message === 'Student not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};
