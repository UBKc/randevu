import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Randevu / Rezervasyon Yönetim Sistemi API',
      version: '1.0.0',
      description:
        'Randevu yönetimi API dokümantasyonu. Roller: ADMIN, STAFF, CUSTOMER. ' +
        'Korumalı uçlar için Authorization: Bearer <token> gerekir.',
    },
    servers: [{ url: 'http://localhost:4001', description: 'Yerel geliştirme' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    tags: [
      { name: 'Auth', description: 'Kimlik doğrulama' },
      { name: 'Hizmetler', description: 'Hizmet tanımlama ve yönetimi' },
      { name: 'Personel', description: 'Personel, hizmet eşleşmeleri, çalışma saatleri ve izinler' },
      { name: 'Slotlar', description: 'Uygun saat aralığı hesaplama' },
      { name: 'Randevular', description: 'Randevu oluşturma ve listeleme' },
    ],
  },
  // JSDoc @openapi bloklarının okunacağı dosyalar.
  apis: ['./src/modules/**/*.routes.ts'],
});
