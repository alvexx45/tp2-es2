import { Router } from 'express';
import { z } from 'zod';
import { esquemaPaginacao } from '../../lib/paginacao.ts';
import { booleanoQuery, dataISO, uuid } from '../../lib/validacao.ts';
import { autenticar, exigirPerfil } from '../../middlewares/auth.ts';
import { validar } from '../../middlewares/validate.ts';
import * as controller from './historico.controller.ts';

const filtros = z.object({
  inicio: dataISO.optional(),
  fim: dataISO.optional(),
  motoristaId: uuid.optional(),
  busca: z.string().trim().max(100).optional(),
  incluirPartida: booleanoQuery,
});

export const historicoRoutes = Router();
historicoRoutes.use(autenticar);
// Motorista também consulta, mas o escopo limita aos próprios roteiros.
historicoRoutes.get(
  '/',
  validar({ query: filtros.extend(esquemaPaginacao.shape) }),
  controller.listar,
);
historicoRoutes.get(
  '/exportar.csv',
  exigirPerfil('GERENTE', 'ADMIN'),
  validar({ query: filtros }),
  controller.exportarCsv,
);
