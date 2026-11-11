import { NextFunction, Request, Response } from 'express';

/**
 * Uygulama hataları için tek tip sınıf. HTTP durum kodu taşır.
 * Örn: throw new AppError(409, 'Bu slot dolu');
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Async controller'ları sarmalar; fırlatılan hatayı Express hata
 * middleware'ine iletir (try/catch tekrarını önler).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
