import { z } from 'zod';

export const createStaffSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'Parola en az 6 karakter olmalı'),
  fullName: z.string().min(2, 'Ad soyad zorunlu'),
  phone: z.string().optional(),
  title: z.string().optional(),
  serviceIds: z.array(z.number().int().positive()).optional(),
});

export const setStaffServicesSchema = z.object({
  serviceIds: z.array(z.number().int().positive()),
});

export const staffIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Haftalık çalışma saatleri — tüm kümeyi değiştirir (replace).
const workingHourItem = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1440),
    endMinute: z.number().int().min(0).max(1440),
  })
  .refine((w) => w.startMinute < w.endMinute, {
    message: 'startMinute < endMinute olmalı',
  });

export const setWorkingHoursSchema = z.object({
  workingHours: z.array(workingHourItem),
});

export const createTimeOffSchema = z
  .object({
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    type: z.enum(['LEAVE', 'HOLIDAY', 'CLOSED']).optional(),
    reason: z.string().optional(),
  })
  .refine((t) => t.startAt < t.endAt, { message: 'startAt < endAt olmalı' });

export const timeOffIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  offId: z.coerce.number().int().positive(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type SetStaffServicesInput = z.infer<typeof setStaffServicesSchema>;
export type SetWorkingHoursInput = z.infer<typeof setWorkingHoursSchema>;
export type CreateTimeOffInput = z.infer<typeof createTimeOffSchema>;
