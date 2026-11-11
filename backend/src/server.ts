import { createApp } from './app';
import { config } from './config';
import { prisma } from './prisma';

async function main() {
  // Başlangıçta veritabanı bağlantısını doğrula.
  await prisma.$connect();
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`Randevu API çalışıyor: http://localhost:${config.port}`);
    console.log(`Swagger: http://localhost:${config.port}/api/docs`);
  });

  // Düzgün kapanış
  const shutdown = async () => {
    console.log('\nKapatılıyor...');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(async (err) => {
  console.error('Sunucu başlatılamadı:', err);
  await prisma.$disconnect();
  process.exit(1);
});
