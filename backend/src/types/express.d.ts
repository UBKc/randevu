import { Role } from '@prisma/client';

// Express Request'e kimlik doğrulanmış kullanıcı bilgisini ekler.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: Role;
        email: string;
      };
    }
  }
}

export {};
