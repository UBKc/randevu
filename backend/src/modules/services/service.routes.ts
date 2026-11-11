import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createHandler,
  deleteHandler,
  getHandler,
  listHandler,
  updateHandler,
} from './service.controller';
import {
  createServiceSchema,
  idParamSchema,
  updateServiceSchema,
} from './service.schemas';

const router = Router();

/**
 * @openapi
 * /api/services:
 *   get:
 *     tags: [Hizmetler]
 *     summary: Hizmetleri listele (aktif). ADMIN ?all=true ile pasifleri de görür.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Hizmet listesi }
 *   post:
 *     tags: [Hizmetler]
 *     summary: Yeni hizmet tanımla (yalnızca ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, durationMinutes, priceCents]
 *             properties:
 *               name: { type: string }
 *               durationMinutes: { type: integer, example: 30 }
 *               priceCents: { type: integer, example: 25000 }
 *               active: { type: boolean }
 *     responses:
 *       201: { description: Oluşturuldu }
 *       403: { description: Yetkisiz }
 */
router.get('/', authenticate, listHandler);
router.post('/', authenticate, authorize('ADMIN'), validate(createServiceSchema), createHandler);

/**
 * @openapi
 * /api/services/{id}:
 *   get:
 *     tags: [Hizmetler]
 *     summary: Tek hizmet getir
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Hizmet }
 *       404: { description: Bulunamadı }
 *   patch:
 *     tags: [Hizmetler]
 *     summary: Hizmet güncelle (yalnızca ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Güncellendi }
 *   delete:
 *     tags: [Hizmetler]
 *     summary: Hizmet sil/pasifleştir (yalnızca ADMIN)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Silindi veya pasifleştirildi }
 */
router.get('/:id', authenticate, validate(idParamSchema, 'params'), getHandler);
router.patch('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema, 'params'), validate(updateServiceSchema), updateHandler);
router.delete('/:id', authenticate, authorize('ADMIN'), validate(idParamSchema, 'params'), deleteHandler);

export default router;
