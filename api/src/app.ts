import express from 'express';
import { env } from './config/env.ts';
import { cors } from './middlewares/cors.ts';

export function criarApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(env.corsOrigins));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
