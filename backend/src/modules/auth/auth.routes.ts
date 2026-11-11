import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginHandler, meHandler, registerHandler } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schemas';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Yeni müşteri kaydı (herkese açık)
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
 *     responses:
 *       201: { description: Kayıt başarılı, token döner }
 *       409: { description: E-posta zaten kayıtlı }
 */
router.post('/register', validate(registerSchema), registerHandler);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Giriş yap, JWT al
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Giriş başarılı, token döner }
 *       401: { description: E-posta veya parola hatalı }
 */
router.post('/login', validate(loginSchema), loginHandler);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Oturum açan kullanıcının bilgileri
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Kullanıcı bilgisi }
 *       401: { description: Kimlik doğrulama gerekli }
 */
router.get('/me', authenticate, meHandler);

export default router;
