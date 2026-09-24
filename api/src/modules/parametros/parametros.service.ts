import type { ParametroSistema, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.ts';
import { ErroRegra } from '../../lib/erros.ts';
import { num } from '../../lib/serializar.ts';

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
