import type { Ponto, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.ts';
import { naoEncontrado } from '../../lib/erros.ts';
import { pagina, paginar, type Paginacao } from '../../lib/paginacao.ts';
import { num } from '../../lib/serializar.ts';
import { registrar } from '../auditoria/auditoria.service.ts';

export interface DadosPonto {
  descricao: string | null;
  endereco: string;
  latitude: number;
  longitude: number;
  ativo?: boolean;
}

export function serializarPonto(p: Ponto) {
  return {
    id: p.id,
    descricao: p.descricao,
    endereco: p.endereco,
    latitude: num(p.latitude, 6),
    longitude: num(p.longitude, 6),
    ativo: p.ativo,
  };
}

export async function listar(filtros: Paginacao & { busca?: string; ativo?: boolean }) {
  const where: Prisma.PontoWhereInput = {
    ativo: filtros.ativo,
    ...(filtros.busca && {
      OR: [
        { endereco: { contains: filtros.busca, mode: 'insensitive' } },
        { descricao: { contains: filtros.busca, mode: 'insensitive' } },
      ],
    }),
  };
  const [itens, total] = await Promise.all([
    prisma.ponto.findMany({ where, orderBy: { endereco: 'asc' }, ...paginar(filtros) }),
    prisma.ponto.count({ where }),
  ]);
  return pagina(itens.map(serializarPonto), total, filtros);
}

export async function obter(id: string) {
  const p = await prisma.ponto.findUnique({ where: { id } });
  if (!p) throw naoEncontrado('Ponto');
  return serializarPonto(p);
}

export async function criar(dados: DadosPonto, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.ponto.create({ data: dados });
    await registrar(tx, {
      entidade: 'Ponto',
      entidadeId: p.id,
      acao: 'CRIACAO',
      valorNovo: p,
      usuarioId,
    });
    return serializarPonto(p);
  });
}

export async function atualizar(id: string, dados: DadosPonto, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.ponto.findUnique({ where: { id } });
    if (!anterior) throw naoEncontrado('Ponto');
    const p = await tx.ponto.update({ where: { id }, data: dados });
    await registrar(tx, {
      entidade: 'Ponto',
      entidadeId: id,
      acao: 'ALTERACAO',
      valorAnterior: anterior,
      valorNovo: p,
      usuarioId,
    });
    return serializarPonto(p);
  });
}

/** DELETE = inativar: o ponto some da busca de novos roteiros, mas continua nos roteiros antigos. */
export async function inativar(id: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.ponto.findUnique({ where: { id } });
    if (!anterior) throw naoEncontrado('Ponto');
    const p = await tx.ponto.update({ where: { id }, data: { ativo: false } });
    await registrar(tx, {
      entidade: 'Ponto',
      entidadeId: id,
      acao: 'EXCLUSAO',
      valorAnterior: anterior,
      valorNovo: p,
      usuarioId,
    });
    return serializarPonto(p);
  });
}
