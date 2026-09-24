import type { Request, Response } from 'express';
import type { Paginacao } from '../../lib/paginacao.ts';
import { usuarioDe } from '../../middlewares/auth.ts';
import * as service from './motoristas.service.ts';

type Filtros = Paginacao & { busca?: string; ativo?: boolean; gerenteId?: string };

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(usuarioDe(req), req.consulta as Filtros));
}

export async function obter(req: Request, res: Response) {
  res.json(await service.obter(req.params.id as string, usuarioDe(req)));
}

export async function criar(req: Request, res: Response) {
  res.status(201).json(await service.criar(req.body, usuarioDe(req)));
}

export async function atualizar(req: Request, res: Response) {
  res.json(await service.atualizar(req.params.id as string, req.body, usuarioDe(req)));
}

export async function inativar(req: Request, res: Response) {
  res.json(await service.inativar(req.params.id as string, usuarioDe(req)));
}

export async function anonimizar(req: Request, res: Response) {
  res.json(await service.anonimizar(req.params.id as string, usuarioDe(req)));
}
