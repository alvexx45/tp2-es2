import type { RequestHandler } from 'express';
import { z } from 'zod';
import { naoEncontrado } from './erros.ts';

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuid = z.string().regex(REGEX_UUID, 'Identificador inválido');

/** `?ativo=true|false` → boolean | undefined */
export const booleanoQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

export const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD');

export const email = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido'));

export const senha = z.string().min(6, 'A senha precisa de pelo menos 6 caracteres').max(72);

/** Ids de rota inválidos respondem 404 (o recurso não existe), sem chegar ao banco. */
export function exigirIdsValidos(...nomes: string[]): RequestHandler {
  return (req, _res, next) => {
    for (const nome of nomes) {
      if (!REGEX_UUID.test(String(req.params[nome] ?? ''))) throw naoEncontrado();
    }
    next();
  };
}

/** Texto opcional: string vazia vira `null`. */
export const textoOpcional = z
  .string()
  .trim()
  .max(255)
  .nullish()
  .transform((v) => (v ? v : null));
