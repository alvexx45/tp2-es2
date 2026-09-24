import type { Request, Response } from 'express';
import { usuarioDe } from '../../middlewares/auth.ts';
import * as service from './auth.service.ts';

export async function login(req: Request, res: Response) {
  res.json(await service.login(req.body.email, req.body.senha));
}

export async function me(req: Request, res: Response) {
  res.json(await service.me(usuarioDe(req).id));
}
