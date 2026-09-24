import type { Request, Response } from 'express';
import { usuarioDe } from '../../middlewares/auth.ts';
import * as service from './roteiros.service.ts';

const id = (req: Request) => req.params.id as string;
const paradaId = (req: Request) => req.params.paradaId as string;

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(usuarioDe(req), req.consulta as service.FiltrosRoteiros));
}

export async function meus(req: Request, res: Response) {
  res.json(await service.meus(usuarioDe(req), req.consulta as service.FiltrosRoteiros));
}

export async function obter(req: Request, res: Response) {
  res.json(await service.obter(id(req), usuarioDe(req)));
}

export async function criar(req: Request, res: Response) {
  res.status(201).json(await service.criar(req.body, usuarioDe(req)));
}

export async function atualizar(req: Request, res: Response) {
  res.json(await service.atualizar(id(req), req.body, usuarioDe(req)));
}

export async function cancelar(req: Request, res: Response) {
  res.json(await service.cancelar(id(req), usuarioDe(req)));
}

export async function chegada(req: Request, res: Response) {
  res.json(
    await service.registrarHorario(id(req), paradaId(req), 'chegada', req.body, usuarioDe(req)),
  );
}

export async function saida(req: Request, res: Response) {
  res.json(
    await service.registrarHorario(id(req), paradaId(req), 'saida', req.body, usuarioDe(req)),
  );
}

export async function corrigir(req: Request, res: Response) {
  res.json(await service.corrigirHorario(id(req), paradaId(req), req.body, usuarioDe(req)));
}

export async function finalizar(req: Request, res: Response) {
  res.json(await service.finalizar(id(req), req.body, usuarioDe(req)));
}
