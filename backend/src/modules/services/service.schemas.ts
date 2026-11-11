import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(2, 'Hizmet adı zorunlu'),
  durationMinutes: z.number().int().positive('Süre pozitif dakika olmalı'),
  priceCents: z.number().int().nonnegative('Ücret negatif olamaz'),
  active: z.boolean().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
