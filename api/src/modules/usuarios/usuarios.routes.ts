import { Router } from 'express';
import { z } from 'zod';
import { esquemaPaginacao } from '../../lib/paginacao.ts';
import { booleanoQuery, email, exigirIdsValidos, senha } from '../../lib/validacao.ts';
import { autenticar, exigirPerfil } from '../../middlewares/auth.ts';
import { validar } from '../../middlewares/validate.ts';
import * as controller from './usuarios.controller.ts';

const perfil = z.enum(['MOTORISTA', 'GERENTE', 'ADMIN']);
const filtros = esquemaPaginacao.extend({
  busca: z.string().trim().optional(),
  perfil: perfil.optional(),
  ativo: booleanoQuery,
});

export const usuariosRoutes = Router();
usuariosRoutes.use(autenticar, exigirPerfil('ADMIN'));
usuariosRoutes.get('/', validar({ query: filtros }), controller.listar);
usuariosRoutes.post('/', validar({ body: z.object({ email, senha, perfil }) }), controller.criar);
usuariosRoutes.patch(
  '/:id',
  exigirIdsValidos('id'),
  validar({
    body: z.object({
      perfil: perfil.optional(),
      ativo: z.boolean().optional(),
      senha: senha.optional(),
    }),
  }),
  controller.atualizar,
);
