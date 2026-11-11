import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { config } from './config';
import { errorHandler, notFound } from './middleware/error';
import authRoutes from './modules/auth/auth.routes';
import serviceRoutes from './modules/services/service.routes';
import staffRoutes from './modules/staff/staff.routes';
import slotRoutes from './modules/slots/slots.routes';
import appointmentRoutes from './modules/appointments/appointment.routes';

export function createApp() {
  const app = express();

  // CORS: yalnızca whitelist'teki kaynaklara izin ver (Randevu frontend'i 5174).
  app.use(
    cors({
      origin(origin, callback) {
        // origin yoksa (curl, Postman, sunucu-içi) izin ver.
        if (!origin || config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS engellendi: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json());

  // Sağlık kontrolü
  app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  // Swagger dokümantasyonu
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

  // API rotaları
  app.use('/api/auth', authRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/slots', slotRoutes);
  app.use('/api/appointments', appointmentRoutes);

  // 404 + hata middleware'i (en sonda)
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
