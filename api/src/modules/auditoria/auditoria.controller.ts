import type { Request, Response } from 'express';
import * as service from './auditoria.service.ts';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(req.consulta as service.FiltrosAuditoria));
}
