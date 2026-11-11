import { PrismaClient } from '@prisma/client';

// Tek bir PrismaClient örneği (bağlantı havuzunu paylaşır).
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
