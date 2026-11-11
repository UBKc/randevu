import { Request, Response } from 'express';
import { AppointmentStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/http';
import * as appts from './appointment.service';

export const createHandler = asyncHandler(async (req: Request, res: Response) => {
  // Test kancaları (yalnızca eşzamanlılık testinde kullanılır):
  //   x-test-delay : uygulama kontrolü ile INSERT arasına gecikme (ms)
  //   x-req-label  : loglarda istek etiketi (A/B)
  const testDelayMs = Number(req.header('x-test-delay')) || undefined;
  const label = req.header('x-req-label') || undefined;

  const appointment = await appts.createAppointment(req.user!.id, req.body, {
    testDelayMs,
    label,
  });
  res.status(201).json(appointment);
});

export const listMineHandler = asyncHandler(async (req: Request, res: Response) => {
  res.json(await appts.listMyAppointments(req.user!.id));
});

export const listHandler = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as {
    from?: Date;
    to?: Date;
    staffId?: number;
    status?: AppointmentStatus;
  };
  const result = await appts.listAppointments(
    { id: req.user!.id, role: req.user!.role },
    { from: q.from, to: q.to, staffId: q.staffId, status: q.status },
  );
  res.json(result);
});

export const cancelHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await appts.cancelAppointment(Number(req.params.id), {
    id: req.user!.id,
    role: req.user!.role,
  });
  res.json(result);
});

export const rescheduleHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await appts.rescheduleAppointment(
    Number(req.params.id),
    { id: req.user!.id, role: req.user!.role },
    req.body.startAt,
  );
  res.json(result);
});

export const statusHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await appts.updateStatus(
    Number(req.params.id),
    { id: req.user!.id, role: req.user!.role },
    req.body.status,
  );
  res.json(result);
});
