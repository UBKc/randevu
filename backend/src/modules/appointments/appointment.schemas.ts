import { z } from 'zod';

export const createAppointmentSchema = z.object({
  staffId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  startAt: z.coerce.date(),
  note: z.string().optional(),
});

export const rescheduleSchema = z.object({
  startAt: z.coerce.date(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
});

export const appointmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  staffId: z.coerce.number().int().positive().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
