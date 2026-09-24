import { Router } from 'express';
import { z } from 'zod';
import { esquemaPaginacao } from '../../lib/paginacao.ts';
import { dataISO, uuid } from '../../lib/validacao.ts';
import { autenticar, exigirPerfil } from '../../middlewares/auth.ts';
import { validar } from '../../middlewares/validate.ts';
import * as controller from './auditoria.controller.ts';

const filtros = esquemaPaginacao.extend({
  entidade: z.string().trim().max(40).optional(),
  entidadeId: uuid.optional(),
  usuarioId: uuid.optional(),
  inicio: dataISO.optional(),
  fim: dataISO.optional(),
});

export const auditoriaRoutes = Router();
auditoriaRoutes.use(autenticar, exigirPerfil('ADMIN'));
auditoriaRoutes.get('/', validar({ query: filtros }), controller.listar);
