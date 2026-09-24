import type { Request, Response } from 'express';
import { usuarioDe } from '../../middlewares/auth.ts';
import * as service from './parametros.service.ts';

export async function vigente(_req: Request, res: Response) {
  res.json(service.serializarParametro(await service.vigente()));
}

export async function listar(req: Request, res: Response) {
  res.json(await service.listar(req.consulta as { pagina: number; tamanho: number }));
}

export async function custos(req: Request, res: Response) {
  res
    .status(201)
    .json(await service.novaVersao(req.body as service.DadosCustos, usuarioDe(req).id));
}

export async function jornada(req: Request, res: Response) {
  res
    .status(201)
    .json(await service.novaVersao(req.body as service.DadosJornada, usuarioDe(req).id));
}
