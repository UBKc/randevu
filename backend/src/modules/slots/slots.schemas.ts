import { z } from 'zod';

export const availableSlotsQuerySchema = z.object({
  staffId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD olmalı'),
  step: z.coerce.number().int().positive().optional(),
});
