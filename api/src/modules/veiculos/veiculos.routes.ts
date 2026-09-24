import { Router } from 'express';
import { z } from 'zod';
import { esquemaPaginacao } from '../../lib/paginacao.ts';
import { booleanoQuery, exigirIdsValidos } from '../../lib/validacao.ts';
import { autenticar, exigirPerfil } from '../../middlewares/auth.ts';
import { validar } from '../../middlewares/validate.ts';
import * as controller from './veiculos.controller.ts';

const dados = z.object({
  placa: z
    .string()
    .trim()
    .toUpperCase()
    .transform((p) => p.replace(/[^A-Z0-9]/g, ''))
    .pipe(z.string().min(5, 'Placa inválida').max(10)),
  modelo: z.string().trim().min(1).max(80),
  tipo: z.enum(['MOTO', 'CARRO', 'VAN', 'CAMINHAO']),
  kmPorLitro: z.number().positive('O rendimento precisa ser maior que zero').max(9999),
  ativo: z.boolean().optional(),
});

const filtros = esquemaPaginacao.extend({
  busca: z.string().trim().optional(),
  ativo: booleanoQuery,
});

export const veiculosRoutes = Router();
veiculosRoutes.use(autenticar, exigirPerfil('GERENTE', 'ADMIN'));
veiculosRoutes.get('/', validar({ query: filtros }), controller.listar);
veiculosRoutes.post('/', validar({ body: dados }), controller.criar);
veiculosRoutes.get('/:id', exigirIdsValidos('id'), controller.obter);
veiculosRoutes.put('/:id', exigirIdsValidos('id'), validar({ body: dados }), controller.atualizar);
veiculosRoutes.delete('/:id', exigirIdsValidos('id'), controller.inativar);
