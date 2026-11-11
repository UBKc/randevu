import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Ortam değişkeni eksik: ${name}`);
  }
  return value;
}

export const config = {
  // TaskFlow 4000'i kullandığı için Randevu varsayılan portu 4001.
  port: Number(process.env.PORT ?? 4001),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET', 'gelistirme-anahtari-degistir'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  // CORS whitelist — virgülle ayrılmış kaynaklar. Varsayılan: Randevu Vite (5174).
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Slot hesabında ve tarih yorumlamada kullanılan işletme saat dilimi.
  businessTimezone: process.env.BUSINESS_TZ ?? 'Europe/Istanbul',
};
