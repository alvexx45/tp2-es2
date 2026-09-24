import type { CargoGestor, Gerente, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma.ts';
import { naoEncontrado } from '../../lib/erros.ts';
import { pagina, paginar, type Paginacao } from '../../lib/paginacao.ts';
import { registrar } from '../auditoria/auditoria.service.ts';

export interface DadosGerente {
  nome: string;
  telefone: string;
  email: string;
  cargo: CargoGestor;
}

type GerenteComEquipe = Gerente & { _count?: { equipe: number } };

function serializar(g: GerenteComEquipe) {
  return {
    id: g.id,
    nome: g.nome,
    telefone: g.telefone,
    email: g.email,
    cargo: g.cargo,
    ativo: g.ativo,
    usuarioId: g.usuarioId,
    tamanhoEquipe: g._count?.equipe ?? undefined,
  };
}

export async function listar(filtros: Paginacao & { busca?: string; ativo?: boolean }) {
  const where: Prisma.GerenteWhereInput = {
    ativo: filtros.ativo,
    ...(filtros.busca && {
      OR: [
        { nome: { contains: filtros.busca, mode: 'insensitive' } },
        { email: { contains: filtros.busca, mode: 'insensitive' } },
      ],
    }),
  };
  const [itens, total] = await Promise.all([
    prisma.gerente.findMany({
      where,
      orderBy: { nome: 'asc' },
      include: { _count: { select: { equipe: true } } },
      ...paginar(filtros),
    }),
    prisma.gerente.count({ where }),
  ]);
  return pagina(itens.map(serializar), total, filtros);
}

export async function obter(id: string) {
  const g = await prisma.gerente.findUnique({
    where: { id },
    include: { _count: { select: { equipe: true } } },
  });
  if (!g) throw naoEncontrado('Gerente');
  return serializar(g);
}

export async function criar(dados: DadosGerente & { senha: string }, usuarioId: string) {
  const senhaHash = await bcrypt.hash(dados.senha, 10);
  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: { email: dados.email, senhaHash, perfil: 'GERENTE' },
    });
    const g = await tx.gerente.create({
      data: {
        nome: dados.nome,
        telefone: dados.telefone,
        email: dados.email,
        cargo: dados.cargo,
        usuarioId: usuario.id,
      },
    });
    await registrar(tx, {
      entidade: 'Usuario',
      entidadeId: usuario.id,
      acao: 'CRIACAO',
      valorNovo: usuario,
      usuarioId,
    });
    await registrar(tx, {
      entidade: 'Gerente',
      entidadeId: g.id,
      acao: 'CRIACAO',
      valorNovo: g,
      usuarioId,
    });
    return serializar(g);
  });
}

export async function atualizar(
  id: string,
  dados: DadosGerente & { ativo?: boolean },
  usuarioId: string,
) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.gerente.findUnique({ where: { id } });
    if (!anterior) throw naoEncontrado('Gerente');
    const g = await tx.gerente.update({ where: { id }, data: dados });
    if (
      g.usuarioId &&
      (dados.email !== anterior.email ||
        (dados.ativo !== undefined && dados.ativo !== anterior.ativo))
    ) {
      await tx.usuario.update({
        where: { id: g.usuarioId },
        data: { email: dados.email, ativo: g.ativo },
      });
    }
    await registrar(tx, {
      entidade: 'Gerente',
      entidadeId: id,
      acao: 'ALTERACAO',
      valorAnterior: anterior,
      valorNovo: g,
      usuarioId,
    });
    return serializar(g);
  });
}

/** DELETE = inativar (RNF01): o gerente e o usuário dele deixam de acessar; o histórico é mantido. */
export async function inativar(id: string, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.gerente.findUnique({ where: { id } });
    if (!anterior) throw naoEncontrado('Gerente');
    const g = await tx.gerente.update({ where: { id }, data: { ativo: false } });
    if (g.usuarioId)
      await tx.usuario.update({ where: { id: g.usuarioId }, data: { ativo: false } });
    await registrar(tx, {
      entidade: 'Gerente',
      entidadeId: id,
      acao: 'EXCLUSAO',
      valorAnterior: anterior,
      valorNovo: g,
      usuarioId,
    });
    return serializar(g);
  });
}
