import type { Perfil, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma.ts';
import { ErroRegra, naoEncontrado } from '../../lib/erros.ts';
import { pagina, paginar, type Paginacao } from '../../lib/paginacao.ts';
import { registrar } from '../auditoria/auditoria.service.ts';

const incluir = {
  motorista: { select: { id: true, nome: true } },
  gerente: { select: { id: true, nome: true } },
} satisfies Prisma.UsuarioInclude;

type UsuarioCompleto = Prisma.UsuarioGetPayload<{ include: typeof incluir }>;

function serializar(u: UsuarioCompleto) {
  return {
    id: u.id,
    email: u.email,
    perfil: u.perfil,
    ativo: u.ativo,
    criadoEm: u.criadoEm,
    nome: u.motorista?.nome ?? u.gerente?.nome ?? null,
    vinculo: u.motorista ? 'MOTORISTA' : u.gerente ? 'GERENTE' : null,
  };
}

export async function listar(
  filtros: Paginacao & { busca?: string; perfil?: Perfil; ativo?: boolean },
) {
  const where: Prisma.UsuarioWhereInput = {
    perfil: filtros.perfil,
    ativo: filtros.ativo,
    ...(filtros.busca && { email: { contains: filtros.busca, mode: 'insensitive' } }),
  };
  const [itens, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      include: incluir,
      orderBy: { email: 'asc' },
      ...paginar(filtros),
    }),
    prisma.usuario.count({ where }),
  ]);
  return pagina(itens.map(serializar), total, filtros);
}

/**
 * Cria um usuário sem vínculo — na prática, administradores. Usuários de gerentes e motoristas
 * são criados junto com o cadastro deles (POST /gerentes e POST /motoristas).
 */
export async function criar(
  dados: { email: string; senha: string; perfil: Perfil },
  usuarioId: string,
) {
  if (dados.perfil !== 'ADMIN') {
    throw new ErroRegra(
      'PERFIL_INCOMPATIVEL',
      'Usuários de gerente e motorista são criados nos cadastros de gerentes e motoristas.',
    );
  }
  const senhaHash = await bcrypt.hash(dados.senha, 10);
  return prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: { email: dados.email, senhaHash, perfil: dados.perfil },
      include: incluir,
    });
    await registrar(tx, {
      entidade: 'Usuario',
      entidadeId: u.id,
      acao: 'CRIACAO',
      valorNovo: u,
      usuarioId,
    });
    return serializar(u);
  });
}

/** Perfis permitidos conforme o vínculo: motorista é sempre MOTORISTA; gerente pode ser GERENTE ou ADMIN. */
function perfilCompativel(u: UsuarioCompleto, perfil: Perfil): boolean {
  if (u.motorista) return perfil === 'MOTORISTA';
  if (u.gerente) return perfil === 'GERENTE' || perfil === 'ADMIN';
  return perfil === 'ADMIN';
}

export async function atualizar(
  id: string,
  dados: { perfil?: Perfil; ativo?: boolean; senha?: string },
  usuarioId: string,
) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.usuario.findUnique({ where: { id }, include: incluir });
    if (!anterior) throw naoEncontrado('Usuário');
    if (dados.perfil && !perfilCompativel(anterior, dados.perfil)) {
      throw new ErroRegra(
        'PERFIL_INCOMPATIVEL',
        'Este perfil não é compatível com o cadastro vinculado ao usuário.',
      );
    }
    if (id === usuarioId && (dados.ativo === false || (dados.perfil && dados.perfil !== 'ADMIN'))) {
      throw new ErroRegra(
        'OPERACAO_NAO_PERMITIDA',
        'Você não pode desativar nem rebaixar o seu próprio usuário.',
      );
    }
    const u = await tx.usuario.update({
      where: { id },
      data: {
        perfil: dados.perfil,
        ativo: dados.ativo,
        ...(dados.senha && { senhaHash: await bcrypt.hash(dados.senha, 10) }),
      },
      include: incluir,
    });
    await registrar(tx, {
      entidade: 'Usuario',
      entidadeId: id,
      acao: 'ALTERACAO',
      valorAnterior: { perfil: anterior.perfil, ativo: anterior.ativo },
      valorNovo: { perfil: u.perfil, ativo: u.ativo, senhaAlterada: Boolean(dados.senha) },
      usuarioId,
    });
    return serializar(u);
  });
}
