import { Router } from 'express';
import { z } from 'zod';
import { esquemaPaginacao } from '../../lib/paginacao.ts';
import {
  booleanoQuery,
  email,
  exigirIdsValidos,
  senha,
  textoOpcional,
  uuid,
} from '../../lib/validacao.ts';
import { autenticar, exigirPerfil } from '../../middlewares/auth.ts';
import { validar } from '../../middlewares/validate.ts';
import * as controller from './motoristas.controller.ts';

const dados = z.object({
  nome: z.string().trim().min(2).max(120),
  telefone: textoOpcional,
  documento: textoOpcional,
  veiculoId: uuid.nullish().transform((v) => v ?? null),
  gerenteId: uuid.optional(),
});

const filtros = esquemaPaginacao.extend({
  busca: z.string().trim().optional(),
  ativo: booleanoQuery,
  gerenteId: uuid.optional(),
});

export const motoristasRoutes = Router();
motoristasRoutes.use(autenticar, exigirPerfil('GERENTE', 'ADMIN'));
motoristasRoutes.get('/', validar({ query: filtros }), controller.listar);
motoristasRoutes.post('/', validar({ body: dados.extend({ email, senha }) }), controller.criar);
motoristasRoutes.get('/:id', exigirIdsValidos('id'), controller.obter);
motoristasRoutes.put(
  '/:id',
  exigirIdsValidos('id'),
  validar({ body: dados.extend({ email: email.optional(), ativo: z.boolean().optional() }) }),
  controller.atualizar,
);
motoristasRoutes.delete('/:id', exigirIdsValidos('id'), controller.inativar);
motoristasRoutes.post(
  '/:id/anonimizar',
  exigirIdsValidos('id'),
  exigirPerfil('ADMIN'),
  controller.anonimizar,
);
