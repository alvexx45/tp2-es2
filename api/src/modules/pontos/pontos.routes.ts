import { Router } from 'express';
import { z } from 'zod';
import { esquemaPaginacao } from '../../lib/paginacao.ts';
import { booleanoQuery, exigirIdsValidos, textoOpcional } from '../../lib/validacao.ts';
import { autenticar, exigirPerfil } from '../../middlewares/auth.ts';
import { validar } from '../../middlewares/validate.ts';
import * as controller from './pontos.controller.ts';

const dados = z.object({
  descricao: textoOpcional,
  endereco: z.string().trim().min(3).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  ativo: z.boolean().optional(),
});

const filtros = esquemaPaginacao.extend({
  busca: z.string().trim().optional(),
  ativo: booleanoQuery,
});

export const pontosRoutes = Router();
pontosRoutes.use(autenticar, exigirPerfil('GERENTE', 'ADMIN'));
pontosRoutes.get('/', validar({ query: filtros }), controller.listar);
pontosRoutes.post('/', validar({ body: dados }), controller.criar);
pontosRoutes.get('/:id', exigirIdsValidos('id'), controller.obter);
pontosRoutes.put('/:id', exigirIdsValidos('id'), validar({ body: dados }), controller.atualizar);
pontosRoutes.delete('/:id', exigirIdsValidos('id'), controller.inativar);
