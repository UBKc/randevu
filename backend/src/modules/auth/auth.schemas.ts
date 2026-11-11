import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'Parola en az 6 karakter olmalı'),
  fullName: z.string().min(2, 'Ad soyad zorunlu'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(1, 'Parola zorunlu'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
