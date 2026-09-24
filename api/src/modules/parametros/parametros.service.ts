import type { ParametroSistema, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.ts';
import { ErroRegra } from '../../lib/erros.ts';
import { num } from '../../lib/serializar.ts';
import { registrar } from '../auditoria/auditoria.service.ts';

type Cliente = Prisma.TransactionClient | typeof prisma;

/** Versão de parâmetros vigente em `em` (a mais recente com `vigenteDesde <= em`). */
export async function vigente(tx: Cliente = prisma, em = new Date()): Promise<ParametroSistema> {
  const p = await tx.parametroSistema.findFirst({
    where: { vigenteDesde: { lte: em } },
    orderBy: { vigenteDesde: 'desc' },
  });
  if (!p)
    throw new ErroRegra('PARAMETROS_AUSENTES', 'Nenhum parâmetro do sistema cadastrado.', 500);
  return p;
}

/** Parâmetros como números, no formato usado pelas funções de domínio. */
export function paraDominio(p: ParametroSistema) {
  return {
    valorCombustivelLitro: Number(p.valorCombustivelLitro),
    kmPorLitroPadrao: Number(p.kmPorLitroPadrao),
    custoOperacionalPorKm: Number(p.custoOperacionalPorKm),
    fatorCorrecaoRota: Number(p.fatorCorrecaoRota),
    jornadaPadraoHoras: Number(p.jornadaPadraoHoras),
    tempoMinimoParadaMin: p.tempoMinimoParadaMin,
    limiteAlertaParadaMin: p.limiteAlertaParadaMin,
  };
}

export function serializarParametro(p: ParametroSistema) {
  return {
    id: p.id,
    vigenteDesde: p.vigenteDesde,
    valorCombustivelLitro: num(p.valorCombustivelLitro, 3),
    kmPorLitroPadrao: num(p.kmPorLitroPadrao),
    custoOperacionalPorKm: num(p.custoOperacionalPorKm, 3),
    fatorCorrecaoRota: num(p.fatorCorrecaoRota),
    jornadaPadraoHoras: num(p.jornadaPadraoHoras),
    tempoMinimoParadaMin: p.tempoMinimoParadaMin,
    limiteAlertaParadaMin: p.limiteAlertaParadaMin,
    criadoPorId: p.criadoPorId,
  };
}

export interface DadosCustos {
  valorCombustivelLitro?: number;
  kmPorLitroPadrao?: number;
  custoOperacionalPorKm?: number;
  fatorCorrecaoRota?: number;
}

export interface DadosJornada {
  jornadaPadraoHoras?: number;
  tempoMinimoParadaMin?: number;
  limiteAlertaParadaMin?: number;
}

export async function listar(filtros: { pagina: number; tamanho: number }) {
  const [itens, total] = await Promise.all([
    prisma.parametroSistema.findMany({
      orderBy: { vigenteDesde: 'desc' },
      skip: (filtros.pagina - 1) * filtros.tamanho,
      take: filtros.tamanho,
    }),
    prisma.parametroSistema.count(),
  ]);
  return {
    itens: itens.map(serializarParametro),
    total,
    pagina: filtros.pagina,
    tamanho: filtros.tamanho,
  };
}

/**
 * Cria uma nova versão copiando da vigente os campos não enviados (Seção 8). Versões antigas nunca mudam:
 * roteiros finalizados continuam apontando para o snapshot com que foram calculados.
 */
export async function novaVersao(dados: DadosCustos & DadosJornada, usuarioId: string) {
  return prisma.$transaction(async (tx) => {
    const atual = await vigente(tx);
    const { id: _id, vigenteDesde: _v, criadoPorId: _c, ...campos } = atual;
    const nova = await tx.parametroSistema.create({
      data: { ...campos, ...dados, vigenteDesde: new Date(), criadoPorId: usuarioId },
    });
    await registrar(tx, {
      entidade: 'ParametroSistema',
      entidadeId: nova.id,
      acao: 'CRIACAO',
      valorAnterior: serializarParametro(atual),
      valorNovo: serializarParametro(nova),
      usuarioId,
    });
    return serializarParametro(nova);
  });
}
