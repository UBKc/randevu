import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/http';

/** Bulunamayan rota için 404. */
export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: `Bulunamadı: ${req.method} ${req.path}` });
}

/** Merkezî hata middleware'i. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Bilinen uygulama hataları
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }

  // Prisma bilinen hataları
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: benzersizlik ihlali (ör. e-posta zaten kayıtlı)
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Kayıt zaten mevcut (benzersizlik ihlali)', code: 'P2002' });
    }
    // P2025: kayıt bulunamadı
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Kayıt bulunamadı', code: 'P2025' });
    }
    // P2003: yabancı anahtar ihlali
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'İlişkili kayıt bulunamadı (foreign key)', code: 'P2003' });
    }
  }

  // EXCLUDE kısıtı ihlali (randevu çakışması) — ham SQL kısıtı olduğu için
  // Prisma bunu bilinmeyen bir DB hatası olarak sarar (kod 23P01).
  const dbErr = err as { code?: string; meta?: { code?: string }; message?: string };
  const pgCode = dbErr?.meta?.code ?? dbErr?.code;
  if (pgCode === '23P01' || (dbErr?.message ?? '').includes('appointments_no_overlap')) {
    return res.status(409).json({
      error: 'Bu personel için seçilen saat aralığı dolu (çakışma)',
      code: 'APPOINTMENT_OVERLAP',
    });
  }

  console.error('Beklenmeyen hata:', err);
  return res.status(500).json({ error: 'Sunucu hatası' });
}
