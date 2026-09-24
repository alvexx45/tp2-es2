import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { calcularCusto } from '../domain/custo.ts';
import { calcularDistancia } from '../domain/distancia.ts';
import {
  calcularPercentualJornada,
  calcularTempoParado,
  calcularTempoTotal,
} from '../domain/tempoParado.ts';
import { horarioLocal, paraColunaData } from '../lib/datas.ts';

/** Gerador pseudoaleatório determinístico (mulberry32) — o seed gera sempre os mesmos dados. */
export function criarAleatorio(semente: number) {
  let a = semente >>> 0;
  const proximo = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const inteiro = (min: number, max: number) => min + Math.floor(proximo() * (max - min + 1));
  return { proximo, inteiro };
}

export interface PontoSeed {
  id: string;
  latitude: number;
  longitude: number;
}

export interface ParametroSeed {
  id: string;
  valorCombustivelLitro: number;
  kmPorLitroPadrao: number;
  custoOperacionalPorKm: number;
  fatorCorrecaoRota: number;
  jornadaPadraoHoras: number;
  tempoMinimoParadaMin: number;
}

export interface RoteiroGerado {
  roteiro: Prisma.RoteiroCreateManyInput;
  paradas: Prisma.PontoRoteiroCreateManyInput[];
}

/**
 * Monta um roteiro FINALIZADO com os cálculos do domínio.
 * `paradas[0]` é a partida (só saída); cada parada seguinte tem deslocamento e tempo parado em minutos.
 */
export function montarRoteiroFinalizado(opcoes: {
  data: string;
  partida: string; // HH:MM
  motoristaId: string;
  gerenteId: string;
  veiculo: { id: string; kmPorLitro: number } | null;
  parametro: ParametroSeed;
  pontos: PontoSeed[];
  deslocamentosMin: number[];
  temposParadaMin: number[];
  codigoPedido?: (ordem: number) => string | null;
}): RoteiroGerado {
  const roteiroId = randomUUID();
  const saidaPartida = horarioLocal(opcoes.data, opcoes.partida);
  const paradas: Prisma.PontoRoteiroCreateManyInput[] = [
    { id: randomUUID(), roteiroId, pontoId: opcoes.pontos[0].id, ordem: 1, saidaEm: saidaPartida },
  ];

  let cursor = saidaPartida.getTime();
  opcoes.temposParadaMin.forEach((tempo, i) => {
    const ordem = i + 2;
    const chegadaEm = new Date(cursor + opcoes.deslocamentosMin[i] * 60000);
    const saidaEm = new Date(chegadaEm.getTime() + tempo * 60000);
    cursor = saidaEm.getTime();
    paradas.push({
      id: randomUUID(),
      roteiroId,
      pontoId: opcoes.pontos[i + 1].id,
      ordem,
      codigoPedido: opcoes.codigoPedido?.(ordem) ?? null,
      chegadaEm,
      saidaEm,
      tempoParadoMin: calcularTempoParado({ ordem, chegadaEm, saidaEm }, opcoes.parametro),
    });
  });

  const tempoTotal = calcularTempoTotal(
    paradas.map((p) => ({ ordem: p.ordem, tempoParadoMin: p.tempoParadoMin ?? null })),
  );
  const distancia = calcularDistancia(opcoes.pontos, opcoes.parametro.fatorCorrecaoRota);
  const { custoEstimado } = calcularCusto(distancia, opcoes.parametro, opcoes.veiculo?.kmPorLitro);

  return {
    roteiro: {
      id: roteiroId,
      data: paraColunaData(opcoes.data),
      status: 'FINALIZADO',
      motoristaId: opcoes.motoristaId,
      gerenteId: opcoes.gerenteId,
      veiculoId: opcoes.veiculo?.id ?? null,
      parametroId: opcoes.parametro.id,
      distanciaTotalKm: distancia,
      tempoTotalParadoMin: tempoTotal,
      custoEstimado,
      percentualJornada: calcularPercentualJornada(tempoTotal, opcoes.parametro.jornadaPadraoHoras),
      finalizadoEm: new Date(cursor + 30 * 60000),
    },
    paradas,
  };
}

/** Roteiro aleatório: partida na base, 3–8 paradas de 2–60 min (Seção 12). */
export function montarRoteiroAleatorio(
  rnd: ReturnType<typeof criarAleatorio>,
  base: Omit<
    Parameters<typeof montarRoteiroFinalizado>[0],
    'pontos' | 'deslocamentosMin' | 'temposParadaMin' | 'partida'
  > & {
    partida: PontoSeed;
    destinos: PontoSeed[];
    minParadas?: number;
    maxParadas?: number;
  },
): RoteiroGerado {
  const n = rnd.inteiro(base.minParadas ?? 3, base.maxParadas ?? 8);
  const pontos = [base.partida];
  for (let i = 0; i < n; i++) {
    let proximo: PontoSeed;
    do {
      proximo = base.destinos[rnd.inteiro(0, base.destinos.length - 1)];
    } while (proximo.id === pontos[pontos.length - 1].id);
    pontos.push(proximo);
  }
  const hora = `0${rnd.inteiro(7, 8)}:${String(rnd.inteiro(0, 5) * 10).padStart(2, '0')}`;
  let pedido = rnd.inteiro(1000, 9000);
  return montarRoteiroFinalizado({
    ...base,
    partida: hora,
    pontos,
    deslocamentosMin: pontos.slice(1).map(() => rnd.inteiro(8, 35)),
    temposParadaMin: pontos.slice(1).map(() => rnd.inteiro(2, 60)),
    codigoPedido: () => (rnd.proximo() < 0.7 ? `PED-${pedido++}` : null),
  });
}
