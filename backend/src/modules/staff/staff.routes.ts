import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createHandler,
  createTimeOffHandler,
  deleteTimeOffHandler,
  getHandler,
  listHandler,
  listTimeOffHandler,
  listWorkingHoursHandler,
  setServicesHandler,
  setWorkingHoursHandler,
} from './staff.controller';
import {
  createStaffSchema,
  createTimeOffSchema,
  setStaffServicesSchema,
  setWorkingHoursSchema,
  staffIdParamSchema,
  timeOffIdParamSchema,
} from './staff.schemas';

const router = Router();

/**
 * @openapi
 * /api/staff:
 *   get:
 *     tags: [Personel]
 *     summary: Personel listesi (kullanıcı bilgisi + hizmetleri)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Personel listesi }
 *   post:
 *     tags: [Personel]
 *     summary: Yeni personel oluştur (yalnızca ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, fullName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               fullName: { type: string }
 *               phone: { type: string }
 *               title: { type: string, example: "Kuaför" }
 *               serviceIds: { type: array, items: { type: integer } }
 *     responses:
 *       201: { description: Personel oluşturuldu }
 *       403: { description: Yetkisiz }
 */
router.get('/', authenticate, listHandler);
router.post('/', authenticate, authorize('ADMIN'), validate(createStaffSchema), createHandler);

/**
 * @openapi
 * /api/staff/{id}:
 *   get:
 *     tags: [Personel]
 *     summary: Tek personel (hizmetler + çalışma saatleri)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Personel }
 *       404: { description: Bulunamadı }
 */
router.get('/:id', authenticate, validate(staffIdParamSchema, 'params'), getHandler);

/**
 * @openapi
 * /api/staff/{id}/services:
 *   put:
 *     tags: [Personel]
 *     summary: Personelin verebildiği hizmet kümesini ayarla (yalnızca ADMIN)
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
 *             required: [serviceIds]
 *             properties:
 *               serviceIds: { type: array, items: { type: integer } }
 *     responses:
 *       200: { description: Güncellenmiş hizmet listesi }
 */
router.put(
  '/:id/services',
  authenticate,
  authorize('ADMIN'),
  validate(staffIdParamSchema, 'params'),
  validate(setStaffServicesSchema),
  setServicesHandler,
);

/**
 * @openapi
 * /api/staff/{id}/working-hours:
 *   get:
 *     tags: [Personel]
 *     summary: Personelin haftalık çalışma saatleri
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Çalışma saati listesi }
 *   put:
 *     tags: [Personel]
 *     summary: Haftalık çalışma saatlerini ayarla (ADMIN veya ilgili personel)
 *     description: Tüm kümeyi değiştirir. dakika bazlı (09:00 = 540).
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
 *             required: [workingHours]
 *             properties:
 *               workingHours:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     dayOfWeek: { type: integer, example: 1 }
 *                     startMinute: { type: integer, example: 540 }
 *                     endMinute: { type: integer, example: 1020 }
 *     responses:
 *       200: { description: Güncellenmiş çalışma saatleri }
 *       403: { description: Yetkisiz }
 */
router.get('/:id/working-hours', authenticate, validate(staffIdParamSchema, 'params'), listWorkingHoursHandler);
router.put(
  '/:id/working-hours',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(staffIdParamSchema, 'params'),
  validate(setWorkingHoursSchema),
  setWorkingHoursHandler,
);

/**
 * @openapi
 * /api/staff/{id}/time-off:
 *   get:
 *     tags: [Personel]
 *     summary: Personelin izin/tatil kayıtları
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: İzin listesi }
 *   post:
 *     tags: [Personel]
 *     summary: İzin/tatil ekle (ADMIN veya ilgili personel)
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
 *             required: [startAt, endAt]
 *             properties:
 *               startAt: { type: string, format: date-time }
 *               endAt: { type: string, format: date-time }
 *               type: { type: string, enum: [LEAVE, HOLIDAY, CLOSED] }
 *               reason: { type: string }
 *     responses:
 *       201: { description: İzin oluşturuldu }
 *       403: { description: Yetkisiz }
 */
router.get('/:id/time-off', authenticate, validate(staffIdParamSchema, 'params'), listTimeOffHandler);
router.post(
  '/:id/time-off',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(staffIdParamSchema, 'params'),
  validate(createTimeOffSchema),
  createTimeOffHandler,
);

/**
 * @openapi
 * /api/staff/{id}/time-off/{offId}:
 *   delete:
 *     tags: [Personel]
 *     summary: İzin/tatil kaydını sil (ADMIN veya ilgili personel)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: offId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Silindi }
 *       404: { description: Bulunamadı }
 */
router.delete(
  '/:id/time-off/:offId',
  authenticate,
  authorize('ADMIN', 'STAFF'),
  validate(timeOffIdParamSchema, 'params'),
  deleteTimeOffHandler,
);

export default router;
