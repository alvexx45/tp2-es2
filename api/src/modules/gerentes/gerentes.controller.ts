import type { Request, Response } from 'express';
import type { Paginacao } from '../../lib/paginacao.ts';
import { usuarioDe } from '../../middlewares/auth.ts';
import * as service from './gerentes.service.ts';

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(req.consulta as Paginacao & { busca?: string; ativo?: boolean }));
}

export async function obter(req: Request, res: Response) {
  res.json(await service.obter(req.params.id as string));
}

export async function criar(req: Request, res: Response) {
  res.status(201).json(await service.criar(req.body, usuarioDe(req).id));
}

export async function atualizar(req: Request, res: Response) {
  res.json(await service.atualizar(req.params.id as string, req.body, usuarioDe(req).id));
}

export async function inativar(req: Request, res: Response) {
  res.json(await service.inativar(req.params.id as string, usuarioDe(req).id));
}
