import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/http';
import { getAvailableSlots } from './slots.service';

export const availableSlotsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { staffId, serviceId, date, step } = req.query as unknown as {
    staffId: number;
    serviceId: number;
    date: string;
    step?: number;
  };
  const result = await getAvailableSlots({ staffId, serviceId, date, stepMinutes: step });
  res.json(result);
});
