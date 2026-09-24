import type { Request, Response } from 'express';
import { usuarioDe } from '../../middlewares/auth.ts';
import * as service from './dashboard.service.ts';

export async function dia(req: Request, res: Response) {
  const q = req.consulta as { data: string; motoristaId?: string };
  res.json(await service.dia(usuarioDe(req), q.data, q.motoristaId));
}

export async function mes(req: Request, res: Response) {
  const q = req.consulta as { ano: number; mes: number; motoristaId?: string };
  res.json(await service.mes(usuarioDe(req), q.ano, q.mes, q.motoristaId));
}

export async function periodo(req: Request, res: Response) {
  const q = req.consulta as { inicio: string; fim: string; motoristaId?: string };
  res.json(await service.periodo(usuarioDe(req), q.inicio, q.fim, q.motoristaId));
}
