import { Router } from 'express';
import { z } from 'zod';
import { hojeLocal } from '../../lib/datas.ts';
import { dataISO, uuid } from '../../lib/validacao.ts';
import { autenticar, exigirPerfil } from '../../middlewares/auth.ts';
import { validar } from '../../middlewares/validate.ts';
import * as controller from './dashboard.controller.ts';

const motorista = { motoristaId: uuid.optional() };

export const dashboardRoutes = Router();
dashboardRoutes.use(autenticar, exigirPerfil('GERENTE', 'ADMIN'));
dashboardRoutes.get(
  '/dia',
  validar({ query: z.object({ data: dataISO.default(() => hojeLocal()), ...motorista }) }),
  controller.dia,
);
dashboardRoutes.get(
  '/mes',
  validar({
    query: z.object({
      ano: z.coerce.number().int().min(2000).max(2100),
      mes: z.coerce.number().int().min(1).max(12),
      ...motorista,
    }),
  }),
  controller.mes,
);
dashboardRoutes.get(
  '/periodo',
  validar({ query: z.object({ inicio: dataISO, fim: dataISO, ...motorista }) }),
  controller.periodo,
);
