import { Request, Response, NextFunction } from 'express';

import * as StaffService from '../services/staff.service';
import type { CreateStaffInput, UpdateStaffInput, StaffQueryInput } from '../validators/staff.validator';

/**
 * BFPS ERP - Staff Controller (Phase 4F)
 */

export const createStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body as CreateStaffInput;
    const staff = await StaffService.createStaff(data);
    res.status(201).json({ success: true, data: staff });
  } catch (error) { next(error); }
};

export const updateStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const data = req.body as UpdateStaffInput;
    const staff = await StaffService.updateStaff(id, data);
    res.status(200).json({ success: true, data: staff });
  } catch (error) { next(error); }
};

export const getStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = req.query as unknown as StaffQueryInput;
    const result = await StaffService.getStaff(filters);
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
};

export const getStaffById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const staff = await StaffService.getStaffById(id);
    res.status(200).json({ success: true, data: staff });
  } catch (error) { next(error); }
};

export const deleteStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await StaffService.deleteStaff(id);
    res.status(200).json({ success: true, message: 'Staff deactivated' });
  } catch (error) { next(error); }
};

export const toggleWebsite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const staff = await StaffService.toggleWebsiteVisibility(id);
    res.status(200).json({ success: true, data: { showOnWebsite: staff.showOnWebsite } });
  } catch (error) { next(error); }
};

export const getWebsiteStaff = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const staff = await StaffService.getWebsiteStaff();
    res.status(200).json({ success: true, data: staff });
  } catch (error) { next(error); }
};
