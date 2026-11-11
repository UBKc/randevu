import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/http';

type Part = 'body' | 'query' | 'params';

/**
 * İsteğin belirtilen kısmını Zod şeması ile doğrular. Geçerliyse
 * ayrıştırılmış (parse edilmiş) veriyi geri yazar; değilse 400 döner.
 */
export function validate(schema: ZodSchema, part: Part = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const detail = result.error.issues
        .map((i) => `${i.path.join('.') || part}: ${i.message}`)
        .join('; ');
      throw new AppError(400, `Doğrulama hatası — ${detail}`, 'VALIDATION_ERROR');
    }
    req[part] = result.data;
    next();
  };
}
