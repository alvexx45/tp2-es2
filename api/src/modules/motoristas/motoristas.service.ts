import type { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma.ts';
import { ErroRegra, naoEncontrado } from '../../lib/erros.ts';
import { escopoMotoristas } from '../../lib/escopo.ts';
import { pagina, paginar, type Paginacao } from '../../lib/paginacao.ts';
import { mascararDocumento, num } from '../../lib/serializar.ts';
import type { UsuarioAutenticado } from '../../lib/tipos.ts';
import { registrar } from '../auditoria/auditoria.service.ts';

export interface DadosMotorista {
  nome: string;
  telefone: string | null;
  documento: string | null;
  veiculoId: string | null;
  gerenteId?: string;
  email?: string;
  ativo?: boolean;
}

const incluir = {
  veiculo: { select: { id: true, placa: true, modelo: true, tipo: true, kmPorLitro: true } },
  gerente: { select: { id: true, nome: true } },
  usuario: { select: { email: true, ativo: true } },
} satisfies Prisma.MotoristaInclude;

type MotoristaCompleto = Prisma.MotoristaGetPayload<{ include: typeof incluir }>;

function serializar(m: MotoristaCompleto, documentoCompleto: boolean) {
  return {
    id: m.id,
    nome: m.nome,
    telefone: m.telefone,
    documento: documentoCompleto ? m.documento : mascararDocumento(m.documento),
    ativo: m.ativo,
    anonimizado: m.anonimizado,
    email: m.usuario?.email ?? null,
    gerente: m.gerente,
    veiculo: m.veiculo ? { ...m.veiculo, kmPorLitro: num(m.veiculo.kmPorLitro) } : null,
  };
}

async function buscarNoEscopo(
  id: string,
  u: UsuarioAutenticado,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const m = await tx.motorista.findFirst({
    where: { id, ...escopoMotoristas(u) },
    include: incluir,
  });
  if (!m) throw naoEncontrado('Motorista');
  return m;
}

/** Gerente só cadastra na própria equipe; admin precisa informar o gerente responsável. */
async function resolverGerente(
  u: UsuarioAutenticado,
  gerenteId: string | undefined,
  tx: Prisma.TransactionClient,
) {
  const id = u.perfil === 'GERENTE' ? u.gerenteId : gerenteId;
  if (!id)
    throw new ErroRegra('GERENTE_OBRIGATORIO', 'Informe o gerente responsável pelo motorista.');
  const gerente = await tx.gerente.findFirst({ where: { id, ativo: true } });
  if (!gerente) throw new ErroRegra('GERENTE_INVALIDO', 'Gerente não encontrado ou inativo.');
  return id;
}

async function validarVeiculo(veiculoId: string | null, tx: Prisma.TransactionClient) {
  if (!veiculoId) return;
  const v = await tx.veiculo.findFirst({ where: { id: veiculoId, ativo: true } });
  if (!v) throw new ErroRegra('VEICULO_INVALIDO', 'Veículo não encontrado ou inativo.');
}

export async function listar(
  u: UsuarioAutenticado,
  filtros: Paginacao & { busca?: string; ativo?: boolean; gerenteId?: string },
) {
  const where: Prisma.MotoristaWhereInput = {
    AND: [
      escopoMotoristas(u),
      {
        ativo: filtros.ativo,
        gerenteId: filtros.gerenteId,
        ...(filtros.busca && { nome: { contains: filtros.busca, mode: 'insensitive' } }),
      },
    ],
  };
  const [itens, total] = await Promise.all([
    prisma.motorista.findMany({
      where,
      include: incluir,
      orderBy: { nome: 'asc' },
      ...paginar(filtros),
    }),
    prisma.motorista.count({ where }),
  ]);
  // Listagem: documento sempre mascarado (LGPD, Seção 11).
  return pagina(
    itens.map((m) => serializar(m, false)),
    total,
    filtros,
  );
}

export async function obter(id: string, u: UsuarioAutenticado) {
  // Detalhe: documento completo (a rota só é acessível a GERENTE/ADMIN).
  return serializar(await buscarNoEscopo(id, u), true);
}

export async function criar(
  dados: DadosMotorista & { email: string; senha: string },
  u: UsuarioAutenticado,
) {
  const senhaHash = await bcrypt.hash(dados.senha, 10);
  return prisma.$transaction(async (tx) => {
    const gerenteId = await resolverGerente(u, dados.gerenteId, tx);
    await validarVeiculo(dados.veiculoId, tx);
    const usuario = await tx.usuario.create({
      data: { email: dados.email, senhaHash, perfil: 'MOTORISTA' },
    });
    const m = await tx.motorista.create({
      data: {
        nome: dados.nome,
        telefone: dados.telefone,
        documento: dados.documento,
        gerenteId,
        veiculoId: dados.veiculoId,
        usuarioId: usuario.id,
      },
      include: incluir,
    });
    await registrar(tx, {
      entidade: 'Usuario',
      entidadeId: usuario.id,
      acao: 'CRIACAO',
      valorNovo: usuario,
      usuarioId: u.id,
    });
    await registrar(tx, {
      entidade: 'Motorista',
      entidadeId: m.id,
      acao: 'CRIACAO',
      valorNovo: dadosAuditaveis(m),
      usuarioId: u.id,
    });
    return serializar(m, true);
  });
}

function dadosAuditaveis(m: MotoristaCompleto) {
  const { veiculo: _v, gerente: _g, usuario: _u, ...campos } = m;
  return campos;
}

export async function atualizar(id: string, dados: DadosMotorista, u: UsuarioAutenticado) {
  return prisma.$transaction(async (tx) => {
    const anterior = await buscarNoEscopo(id, u, tx);
    if (anterior.anonimizado) {
      throw new ErroRegra('MOTORISTA_ANONIMIZADO', 'Motorista anonimizado não pode ser alterado.');
    }
    // Só o admin transfere o motorista de equipe.
    const gerenteId =
      u.perfil === 'ADMIN' && dados.gerenteId
        ? await resolverGerente(u, dados.gerenteId, tx)
        : anterior.gerenteId;
    await validarVeiculo(dados.veiculoId, tx);
    const m = await tx.motorista.update({
      where: { id },
      data: {
        nome: dados.nome,
        telefone: dados.telefone,
        documento: dados.documento,
        veiculoId: dados.veiculoId,
        gerenteId,
        ativo: dados.ativo,
      },
      include: incluir,
    });
    if (m.usuarioId && (dados.email || dados.ativo !== undefined)) {
      await tx.usuario.update({
        where: { id: m.usuarioId },
        data: { email: dados.email, ativo: m.ativo },
      });
    }
    await registrar(tx, {
      entidade: 'Motorista',
      entidadeId: id,
      acao: 'ALTERACAO',
      valorAnterior: dadosAuditaveis(anterior),
      valorNovo: dadosAuditaveis(m),
      usuarioId: u.id,
    });
    return serializar(m, true);
  });
}

/** DELETE = inativar (RNF01). O usuário do motorista também é desativado. */
export async function inativar(id: string, u: UsuarioAutenticado) {
  return prisma.$transaction(async (tx) => {
    const anterior = await buscarNoEscopo(id, u, tx);
    const m = await tx.motorista.update({
      where: { id },
      data: { ativo: false },
      include: incluir,
    });
    if (m.usuarioId)
      await tx.usuario.update({ where: { id: m.usuarioId }, data: { ativo: false } });
    await registrar(tx, {
      entidade: 'Motorista',
      entidadeId: id,
      acao: 'EXCLUSAO',
      valorAnterior: dadosAuditaveis(anterior),
      valorNovo: dadosAuditaveis(m),
      usuarioId: u.id,
    });
    return serializar(m, false);
  });
}

/**
 * Anonimização LGPD (RNF06, Seção 11): remove os dados pessoais e desativa o usuário.
 * Os roteiros continuam para estatística, sem dado pessoal.
 */
export async function anonimizar(id: string, u: UsuarioAutenticado) {
  return prisma.$transaction(async (tx) => {
    const anterior = await buscarNoEscopo(id, u, tx);
    const m = await tx.motorista.update({
      where: { id },
      data: {
        nome: `Motorista anonimizado ${id.slice(0, 6)}`,
        telefone: null,
        documento: null,
        anonimizado: true,
        ativo: false,
      },
      include: incluir,
    });
    if (m.usuarioId) {
      // O e-mail também é dado pessoal: substituído por um identificador técnico.
      await tx.usuario.update({
        where: { id: m.usuarioId },
        data: { ativo: false, email: `anonimizado-${m.usuarioId}@anonimizado.invalid` },
      });
    }
    await registrar(tx, {
      entidade: 'Motorista',
      entidadeId: id,
      acao: 'ALTERACAO',
      valorAnterior: {
        nome: '(dado pessoal removido)',
        anonimizado: anterior.anonimizado,
        ativo: anterior.ativo,
      },
      valorNovo: dadosAuditaveis(m),
      usuarioId: u.id,
    });
    return serializar(
      await tx.motorista.findUniqueOrThrow({ where: { id }, include: incluir }),
      false,
    );
  });
}
