import express from 'express';
import { env } from './config/env.ts';
import { cors } from './middlewares/cors.ts';
import { errorHandler, rotaNaoEncontrada } from './middlewares/errorHandler.ts';
import { authRoutes } from './modules/auth/auth.routes.ts';
import { gerentesRoutes } from './modules/gerentes/gerentes.routes.ts';
import { motoristasRoutes } from './modules/motoristas/motoristas.routes.ts';
import { pontosRoutes } from './modules/pontos/pontos.routes.ts';
import { usuariosRoutes } from './modules/usuarios/usuarios.routes.ts';
import { veiculosRoutes } from './modules/veiculos/veiculos.routes.ts';

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
  api.use('/usuarios', usuariosRoutes);
  api.use('/gerentes', gerentesRoutes);
  api.use('/motoristas', motoristasRoutes);
  api.use('/veiculos', veiculosRoutes);
  api.use('/pontos', pontosRoutes);
  app.use('/api', api);

  app.use('/api', rotaNaoEncontrada);
  app.use(errorHandler);
  return app;
}
