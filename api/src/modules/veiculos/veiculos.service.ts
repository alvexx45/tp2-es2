import type { Prisma, TipoVeiculo, Veiculo } from '@prisma/client';
import { prisma } from '../../db/prisma.ts';
import { naoEncontrado } from '../../lib/erros.ts';
import { pagina, paginar, type Paginacao } from '../../lib/paginacao.ts';
import { num } from '../../lib/serializar.ts';
import { registrar } from '../auditoria/auditoria.service.ts';

export interface DadosVeiculo {
  placa: string;
  modelo: string;
  tipo: TipoVeiculo;
  kmPorLitro: number;
  ativo?: boolean;
}

function serializar(v: Veiculo) {
  return {
    id: v.id,
    placa: v.placa,
    modelo: v.modelo,
    tipo: v.tipo,
    kmPorLitro: num(v.kmPorLitro),
    ativo: v.ativo,
  };
}

export async function listar(filtros: Paginacao & { busca?: string; ativo?: boolean }) {
  const where: Prisma.VeiculoWhereInput = {
    ativo: filtros.ativo,
    ...(filtros.busca && {
      OR: [
        { placa: { contains: filtros.busca, mode: 'insensitive' } },
        { modelo: { contains: filtros.busca, mode: 'insensitive' } },
      ],
    }),
  };
  const [itens, total] = await Promise.all([
    prisma.veiculo.findMany({ where, orderBy: { placa: 'asc' }, ...paginar(filtros) }),
    prisma.veiculo.count({ where }),
  ]);
  return pagina(itens.map(serializar), total, filtros);
}

export async function obter(id: string) {
  const v = await prisma.veiculo.findUnique({ where: { id } });
  if (!v) throw naoEncontrado('Veículo');
  return serializar(v);
}

export async function criar(dados: DadosVeiculo, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const v = await tx.veiculo.create({ data: dados });
    await registrar(tx, {
      entidade: 'Veiculo',
      entidadeId: v.id,
      acao: 'CRIACAO',
      valorNovo: v,
      usuarioId,
    });
    return serializar(v);
  });
}

export async function atualizar(id: string, dados: DadosVeiculo, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.veiculo.findUnique({ where: { id } });
    if (!anterior) throw naoEncontrado('Veículo');
    const v = await tx.veiculo.update({ where: { id }, data: dados });
    await registrar(tx, {
      entidade: 'Veiculo',
      entidadeId: id,
      acao: 'ALTERACAO',
      valorAnterior: anterior,
      valorNovo: v,
      usuarioId,
    });
    return serializar(v);
  });
}

export async function inativar(id: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.veiculo.findUnique({ where: { id } });
    if (!anterior) throw naoEncontrado('Veículo');
    const v = await tx.veiculo.update({ where: { id }, data: { ativo: false } });
    await registrar(tx, {
      entidade: 'Veiculo',
      entidadeId: id,
      acao: 'EXCLUSAO',
      valorAnterior: anterior,
      valorNovo: v,
      usuarioId,
    });
    return serializar(v);
  });
}
