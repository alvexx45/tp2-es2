import express from 'express';
import { env } from './config/env.ts';
import { cors } from './middlewares/cors.ts';
import { errorHandler, rotaNaoEncontrada } from './middlewares/errorHandler.ts';
import { authRoutes } from './modules/auth/auth.routes.ts';

export function criarApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(env.corsOrigins));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const api = express.Router();
  api.use('/auth', authRoutes);
  app.use('/api', api);

  app.use('/api', rotaNaoEncontrada);
  app.use(errorHandler);
  return app;
}
