import { arredondar } from './numeros.ts';

export interface ParadaHorarios {
  ordem: number;
  chegadaEm: Date | null;
  saidaEm: Date | null;
}

export interface RegrasTempoParado {
  tempoMinimoParadaMin: number;
}

/** Ordem 1 é a partida (RN01 — regra fixa, não parametrizável). */
export function ehPartida(parada: { ordem: number }): boolean {
  return parada.ordem === 1;
}

/**
 * Tempo parado de uma parada em minutos (RN01, RN02, RF06, RF10).
 * Retorna `null` na partida ou enquanto a parada não tem chegada e saída.
 */
export function calcularTempoParado(
  parada: ParadaHorarios,
  regras: RegrasTempoParado,
): number | null {
  if (ehPartida(parada)) return null;
  if (!parada.chegadaEm || !parada.saidaEm) return null;
  const segundos = (parada.saidaEm.getTime() - parada.chegadaEm.getTime()) / 1000;
  const minutos = Math.round(segundos / 60);
  if (minutos < regras.tempoMinimoParadaMin) return 0;
  return minutos;
}

/** RN03: soma do tempo parado das paradas com ordem > 1 e tempo não nulo. */
export function calcularTempoTotal(
  paradas: { ordem: number; tempoParadoMin: number | null }[],
): number {
  return paradas.reduce(
    (total, p) => (p.ordem > 1 && p.tempoParadoMin !== null ? total + p.tempoParadoMin : total),
    0,
  );
}

/**
 * RN04: percentual da jornada (2 casas, half-up).
 * Para agregados (mês/período) informe o número de roteiros considerados.
 */
export function calcularPercentualJornada(
  tempoParadoMin: number,
  jornadaPadraoHoras: number,
  roteiros = 1,
): number {
  const minutosJornada = roteiros * jornadaPadraoHoras * 60;
  if (minutosJornada <= 0) return 0;
  return arredondar((tempoParadoMin / minutosJornada) * 100, 2);
}

/** RF10: o limite de alerta não altera o cálculo, só marca a parada. */
export function emAlerta(tempoParadoMin: number | null, limiteAlertaParadaMin: number): boolean {
  return tempoParadoMin !== null && tempoParadoMin > limiteAlertaParadaMin;
}
