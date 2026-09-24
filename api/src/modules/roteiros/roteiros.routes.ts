import { Router } from 'express';
import { z } from 'zod';
import { esquemaPaginacao } from '../../lib/paginacao.ts';
import { dataISO, exigirIdsValidos, uuid } from '../../lib/validacao.ts';
import { autenticar, exigirPerfil } from '../../middlewares/auth.ts';
import { validar } from '../../middlewares/validate.ts';
import * as controller from './roteiros.controller.ts';

const status = z.enum(['PLANEJADO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO']);

const filtros = esquemaPaginacao.extend({
  data: dataISO.optional(),
  inicio: dataISO.optional(),
  fim: dataISO.optional(),
  motoristaId: uuid.optional(),
  status: status.optional(),
});

const montagem = z.object({
  data: dataISO,
  motoristaId: uuid,
  veiculoId: uuid.nullish(),
  paradas: z
    .array(
      z.object({
        pontoId: uuid,
        ordem: z.number().int(),
        codigoPedido: z.string().trim().max(60).nullish(),
      }),
    )
    .max(100),
});

/** Data/hora ISO 8601 com fuso (ex.: 2026-09-24T08:20:00-03:00). */
const dataHora = z.iso.datetime({ offset: true }).transform((v) => new Date(v));

const registro = z.object({
  dataHora: dataHora.optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const correcao = z
  .object({ chegadaEm: dataHora.nullable().optional(), saidaEm: dataHora.nullable().optional() })
  .refine(
    (d) => d.chegadaEm !== undefined || d.saidaEm !== undefined,
    'Informe chegadaEm e/ou saidaEm',
  );

const finalizacao = z.object({ kmInformado: z.number().positive().max(5000).nullish() });

const GESTAO = ['GERENTE', 'ADMIN'] as const;

export const roteirosRoutes = Router();
roteirosRoutes.use(autenticar);
roteirosRoutes.get('/', exigirPerfil(...GESTAO), validar({ query: filtros }), controller.listar);
roteirosRoutes.post('/', exigirPerfil(...GESTAO), validar({ body: montagem }), controller.criar);
roteirosRoutes.get(
  '/meus',
  exigirPerfil('MOTORISTA'),
  validar({ query: filtros }),
  controller.meus,
);

roteirosRoutes.use('/:id', exigirIdsValidos('id'));
roteirosRoutes.get('/:id', controller.obter);
roteirosRoutes.put(
  '/:id',
  exigirPerfil(...GESTAO),
  validar({ body: montagem }),
  controller.atualizar,
);
roteirosRoutes.post('/:id/cancelar', exigirPerfil(...GESTAO), controller.cancelar);
roteirosRoutes.post('/:id/finalizar', validar({ body: finalizacao }), controller.finalizar);

roteirosRoutes.use('/:id/paradas/:paradaId', exigirIdsValidos('id', 'paradaId'));
roteirosRoutes.post(
  '/:id/paradas/:paradaId/chegada',
  exigirPerfil('MOTORISTA'),
  validar({ body: registro }),
  controller.chegada,
);
roteirosRoutes.post(
  '/:id/paradas/:paradaId/saida',
  exigirPerfil('MOTORISTA'),
  validar({ body: registro }),
  controller.saida,
);
roteirosRoutes.patch(
  '/:id/paradas/:paradaId',
  exigirPerfil(...GESTAO),
  validar({ body: correcao }),
  controller.corrigir,
);
