import type { Perfil } from '@prisma/client';
import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';
import { prisma } from '../db/prisma.ts';
import { acessoNegado, naoAutenticado } from '../lib/erros.ts';
import type { UsuarioAutenticado } from '../lib/tipos.ts';

interface PayloadToken {
  sub: string;
  perfil: Perfil;
  motoristaId?: string;
  gerenteId?: string;
}

export function assinarToken(u: UsuarioAutenticado): string {
  const payload: PayloadToken = {
    sub: u.id,
    perfil: u.perfil,
    motoristaId: u.motoristaId,
    gerenteId: u.gerenteId,
  };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/** Exige `Authorization: Bearer <token>` válido e usuário ainda ativo. */
export const autenticar: RequestHandler = async (req, _res, next) => {
  const [tipo, token] = (req.headers.authorization ?? '').split(' ');
  if (tipo !== 'Bearer' || !token) throw naoAutenticado();

  let payload: PayloadToken;
  try {
    payload = jwt.verify(token, env.jwtSecret) as PayloadToken;
  } catch {
    throw naoAutenticado('Sessão expirada ou inválida. Faça login novamente.');
  }

  // Usuário inativado (ou com perfil alterado) perde o acesso imediatamente.
  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.sub },
    select: { ativo: true, perfil: true },
  });
  if (!usuario?.ativo || usuario.perfil !== payload.perfil) {
    throw naoAutenticado('Sessão expirada ou inválida. Faça login novamente.');
  }

  req.usuario = {
    id: payload.sub,
    perfil: payload.perfil,
    motoristaId: payload.motoristaId,
    gerenteId: payload.gerenteId,
  };
  next();
};

/** Restringe a rota aos perfis informados (403 para os demais). */
export function exigirPerfil(...perfis: Perfil[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) throw acessoNegado();
    next();
  };
}

/** Usuário autenticado da requisição (as rotas protegidas sempre passam por `autenticar`). */
export function usuarioDe(req: Request): UsuarioAutenticado {
  if (!req.usuario) throw naoAutenticado();
  return req.usuario;
}
