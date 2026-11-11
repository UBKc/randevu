import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { availableSlotsHandler } from './slots.controller';
import { availableSlotsQuerySchema } from './slots.schemas';

const router = Router();

/**
 * @openapi
 * /api/slots:
 *   get:
 *     tags: [Slotlar]
 *     summary: Bir personel + hizmet + gün için uygun saat aralıklarını hesaplar
 *     description: >
 *       Çalışma saatleri, izin/tatil, dolu randevular, hizmet süresi ve
 *       geçmiş saatler dikkate alınarak uygun slotlar döner. Yanıttaki
 *       "counts" alanı her filtre aşamasında kalan slot sayısını verir.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: staffId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, example: "2026-08-28" }
 *       - in: query
 *         name: step
 *         required: false
 *         schema: { type: integer, example: 30 }
 *     responses:
 *       200: { description: Uygun slot listesi + aşama sayıları }
 *       400: { description: Geçersiz parametre / personel bu hizmeti vermiyor }
 *       404: { description: Personel veya hizmet bulunamadı }
 */
router.get('/', authenticate, validate(availableSlotsQuerySchema, 'query'), availableSlotsHandler);

export default router;
