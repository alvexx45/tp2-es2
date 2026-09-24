import { Router } from 'express';
import { z } from 'zod';
import { esquemaPaginacao } from '../../lib/paginacao.ts';
import { autenticar, exigirPerfil } from '../../middlewares/auth.ts';
import { validar } from '../../middlewares/validate.ts';
import * as controller from './parametros.controller.ts';

const algumCampo = (d: object) => Object.values(d).some((v) => v !== undefined);

// RF09 — custos (gerente e admin). Custo operacional pode ser 0 (padrão do schema).
const custos = z
  .object({
    valorCombustivelLitro: z.number().positive().max(100).optional(),
    kmPorLitroPadrao: z.number().positive().max(9999).optional(),
    custoOperacionalPorKm: z.number().min(0).max(1000).optional(),
    fatorCorrecaoRota: z.number().min(1).max(3).optional(),
  })
  .refine(algumCampo, 'Informe ao menos um campo');

// RF10 — jornada e regras de tempo parado (só admin). Tempo mínimo pode ser 0 (padrão do schema).
const jornada = z
  .object({
    jornadaPadraoHoras: z.number().min(1).max(24).optional(),
    tempoMinimoParadaMin: z.number().int().min(0).max(600).optional(),
    limiteAlertaParadaMin: z.number().int().positive().max(1440).optional(),
  })
  .refine(algumCampo, 'Informe ao menos um campo');

export const parametrosRoutes = Router();
parametrosRoutes.use(autenticar);
parametrosRoutes.get('/vigente', controller.vigente);
parametrosRoutes.get(
  '/',
  exigirPerfil('GERENTE', 'ADMIN'),
  validar({ query: esquemaPaginacao }),
  controller.listar,
);
parametrosRoutes.post(
  '/custos',
  exigirPerfil('GERENTE', 'ADMIN'),
  validar({ body: custos }),
  controller.custos,
);
parametrosRoutes.post(
  '/jornada',
  exigirPerfil('ADMIN'),
  validar({ body: jornada }),
  controller.jornada,
);
