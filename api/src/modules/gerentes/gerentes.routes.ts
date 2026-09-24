import { Router } from 'express';
import { z } from 'zod';
import { esquemaPaginacao } from '../../lib/paginacao.ts';
import { booleanoQuery, email, exigirIdsValidos, senha } from '../../lib/validacao.ts';
import { autenticar, exigirPerfil } from '../../middlewares/auth.ts';
import { validar } from '../../middlewares/validate.ts';
import * as controller from './gerentes.controller.ts';

const dados = z.object({
  nome: z.string().trim().min(2).max(120),
  telefone: z.string().trim().min(8).max(30),
  email,
  cargo: z.enum(['GERENTE', 'COORDENADOR', 'DONO']).default('GERENTE'),
});

const filtros = esquemaPaginacao.extend({
  busca: z.string().trim().optional(),
  ativo: booleanoQuery,
});

export const gerentesRoutes = Router();
gerentesRoutes.use(autenticar, exigirPerfil('ADMIN'));
gerentesRoutes.get('/', validar({ query: filtros }), controller.listar);
gerentesRoutes.post('/', validar({ body: dados.extend({ senha }) }), controller.criar);
gerentesRoutes.get('/:id', exigirIdsValidos('id'), controller.obter);
gerentesRoutes.put(
  '/:id',
  exigirIdsValidos('id'),
  validar({ body: dados.extend({ ativo: z.boolean().optional() }) }),
  controller.atualizar,
);
gerentesRoutes.delete('/:id', exigirIdsValidos('id'), controller.inativar);
