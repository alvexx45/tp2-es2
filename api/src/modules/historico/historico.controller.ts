import type { Request, Response } from 'express';
import type { Paginacao } from '../../lib/paginacao.ts';
import { usuarioDe } from '../../middlewares/auth.ts';
import * as service from './historico.service.ts';

export async function listar(req: Request, res: Response) {
  res.json(
    await service.listar(usuarioDe(req), req.consulta as service.FiltrosHistorico & Paginacao),
  );
}

export async function exportarCsv(req: Request, res: Response) {
  const csv = await service.exportarCsv(usuarioDe(req), req.consulta as service.FiltrosHistorico);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="historico-tempo-parado.csv"');
  res.send(csv);
}
