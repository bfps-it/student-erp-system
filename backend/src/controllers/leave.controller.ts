import { Request, Response, NextFunction } from 'express';

import * as LeaveService from '../services/leave.service';
import type { ApplyLeaveInput, LeaveQueryInput } from '../validators/leave.validator';

/**
 * BFPS ERP - Leave Controller (Phase 4F)
 */

export const applyLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as ApplyLeaveInput;
    const leave = await LeaveService.applyLeave(data, 'APP');
    res.status(201).json({ success: true, data: leave });
  } catch (error) { next(error); }
};

export const getLeaves = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = req.query as unknown as LeaveQueryInput;
    const result = await LeaveService.getLeaves(filters);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getMyLeaves = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staffId = (req as any).user?.staffId ?? 0;
    const leaves = await LeaveService.getMyLeaves(staffId);
    res.status(200).json({ success: true, data: leaves });
  } catch (error) { next(error); }
};

export const getLeaveStats = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await LeaveService.getLeaveStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) { next(error); }
};

export const getLeaveById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const leave = await LeaveService.getLeaveById(id);
    res.status(200).json({ success: true, data: leave });
  } catch (error) { next(error); }
};

export const principalAction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { action, note } = req.body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const principalId = (req as any).user?.staffId ?? 0;
    const leave = await LeaveService.principalAction(id, action, principalId, note);
    res.status(200).json({ success: true, data: leave });
  } catch (error) { next(error); }
};

export const directorAction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { action, note } = req.body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const directorId = (req as any).user?.staffId ?? 0;
    const leave = await LeaveService.directorAction(id, action, directorId, note);
    res.status(200).json({ success: true, data: leave });
  } catch (error) { next(error); }
};

export const cancelLeave = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staffId = (req as any).user?.staffId ?? 0;
    const leave = await LeaveService.cancelLeave(id, staffId);
    res.status(200).json({ success: true, data: leave });
  } catch (error) { next(error); }
};
