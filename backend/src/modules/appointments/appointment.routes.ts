import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  cancelHandler,
  createHandler,
  listHandler,
  listMineHandler,
  rescheduleHandler,
  statusHandler,
} from './appointment.controller';
import {
  appointmentIdParamSchema,
  createAppointmentSchema,
  listQuerySchema,
  rescheduleSchema,
  updateStatusSchema,
} from './appointment.schemas';

const router = Router();

/**
 * @openapi
 * /api/appointments:
 *   get:
 *     tags: [Randevular]
 *     summary: Randevuları listele (role duyarlı; ADMIN tümü, STAFF kendi, CUSTOMER kendi)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: staffId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED] }
 *     responses:
 *       200: { description: Randevu listesi }
 *   post:
 *     tags: [Randevular]
 *     summary: Randevu oluştur (müşteri kendi adına)
 *     description: >
 *       Çakışma kontrolü iki katmanda: uygulama ön kontrolü + DB EXCLUDE kısıtı.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [staffId, serviceId, startAt]
 *             properties:
 *               staffId: { type: integer }
 *               serviceId: { type: integer }
 *               startAt: { type: string, format: date-time, example: "2026-09-09T15:00:00+03:00" }
 *               note: { type: string }
 *     responses:
 *       201: { description: Randevu oluşturuldu }
 *       400: { description: Geçmiş/çalışma saati dışı/izinli }
 *       409: { description: Slot dolu (çakışma) }
 */
router.get('/', authenticate, validate(listQuerySchema, 'query'), listHandler);
router.post('/', authenticate, authorize('CUSTOMER', 'ADMIN'), validate(createAppointmentSchema), createHandler);

/**
 * @openapi
 * /api/appointments/mine:
 *   get:
 *     tags: [Randevular]
 *     summary: Oturum açan müşterinin randevuları
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Randevu listesi }
 */
router.get('/mine', authenticate, listMineHandler);

/**
 * @openapi
 * /api/appointments/{id}/cancel:
 *   patch:
 *     tags: [Randevular]
 *     summary: Randevu iptal (sahibi müşteri, ADMIN veya atanmış personel)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: İptal edildi }
 *       400: { description: Tamamlanmış/zaten iptal }
 *       403: { description: Yetkisiz }
 */
router.patch('/:id/cancel', authenticate, validate(appointmentIdParamSchema, 'params'), cancelHandler);

/**
 * @openapi
 * /api/appointments/{id}/reschedule:
 *   patch:
 *     tags: [Randevular]
 *     summary: Randevu erteleme (yeni başlangıç saati)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startAt]
 *             properties:
 *               startAt: { type: string, format: date-time }
 *     responses:
 *       200: { description: Ertelendi }
 *       400: { description: Geçmiş/çalışma saati dışı/izinli/tamamlanmış }
 *       409: { description: Slot dolu }
 */
router.patch(
  '/:id/reschedule',
  authenticate,
  validate(appointmentIdParamSchema, 'params'),
  validate(rescheduleSchema),
  rescheduleHandler,
);

/**
 * @openapi
 * /api/appointments/{id}/status:
 *   patch:
 *     tags: [Randevular]
 *     summary: Randevu durumunu güncelle (ADMIN veya atanmış personel)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PENDING, CONFIRMED, COMPLETED, CANCELLED] }
 *     responses:
 *       200: { description: Güncellendi }
 *       403: { description: Yetkisiz }
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(appointmentIdParamSchema, 'params'),
  validate(updateStatusSchema),
  statusHandler,
);

export default router;
