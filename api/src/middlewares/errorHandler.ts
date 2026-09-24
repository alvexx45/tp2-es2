import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ErroRegra } from '../domain/erros.ts';

function corpo(codigo: string, mensagem: string, detalhes: Record<string, unknown> = {}) {
  return { erro: { codigo, mensagem, detalhes } };
}

export const rotaNaoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json(corpo('NAO_ENCONTRADO', 'Rota não encontrada.'));
};

/** Converte erros no formato padrão `{ erro: { codigo, mensagem, detalhes } }` (Seção 8). */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ErroRegra) {
    res.status(err.status).json(corpo(err.codigo, err.message, err.detalhes));
    return;
  }
  if (err instanceof ZodError) {
    const campos = err.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message }));
    res.status(422).json(corpo('DADOS_INVALIDOS', 'Dados inválidos.', { campos }));
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json(
        corpo('REGISTRO_DUPLICADO', 'Já existe um registro com estes dados.', {
          campos: err.meta?.target,
        }),
      );
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json(corpo('NAO_ENCONTRADO', 'Registro não encontrado.'));
      return;
    }
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json(corpo('JSON_INVALIDO', 'Corpo da requisição não é um JSON válido.'));
    return;
  }
  // Nunca registrar dados pessoais no console (Seção 11): só o tipo e a mensagem do erro.
  console.error(`[erro] ${err?.name ?? 'Erro'}: ${err?.message ?? err}`);
  res.status(500).json(corpo('ERRO_INTERNO', 'Erro interno. Tente novamente.'));
};
