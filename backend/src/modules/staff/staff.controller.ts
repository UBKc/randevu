import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/http';
import * as staff from './staff.service';

export const listHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await staff.listStaff());
});

export const getHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await staff.getStaff(Number(req.params.id)));
});

export const createHandler = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(await staff.createStaff(req.body));
});

export const setServicesHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await staff.setStaffServices(Number(req.params.id), req.body));
});

// --- Çalışma saatleri ---

export const listWorkingHoursHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await staff.listWorkingHours(Number(req.params.id)));
});

export const setWorkingHoursHandler = asyncHandler(async (req: Request, res: Response) => {
  const staffId = Number(req.params.id);
  await staff.assertCanManageStaff(staffId, req.user!);
  res.json(await staff.setWorkingHours(staffId, req.body));
});

// --- İzin / tatil ---

export const listTimeOffHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await staff.listTimeOff(Number(req.params.id)));
});

export const createTimeOffHandler = asyncHandler(async (req: Request, res: Response) => {
  const staffId = Number(req.params.id);
  await staff.assertCanManageStaff(staffId, req.user!);
  res.status(201).json(await staff.createTimeOff(staffId, req.body));
});

export const deleteTimeOffHandler = asyncHandler(async (req: Request, res: Response) => {
  const staffId = Number(req.params.id);
  await staff.assertCanManageStaff(staffId, req.user!);
  res.json(await staff.deleteTimeOff(staffId, Number(req.params.offId)));
});
