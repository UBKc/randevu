import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/http';
import { verifyToken } from '../utils/jwt';

/**
 * Authorization: Bearer <token> başlığını doğrular ve req.user'ı doldurur.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'Kimlik doğrulama gerekli (Bearer token yok)');
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    throw new AppError(401, 'Geçersiz veya süresi dolmuş token');
  }
}

/**
 * Rol bazlı yetkilendirme. authenticate'ten SONRA kullanılır.
 * Örn: router.post('/', authenticate, authorize('ADMIN'), handler)
 */
export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, 'Kimlik doğrulama gerekli');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'Bu işlem için yetkiniz yok');
    }
    next();
  };
}
