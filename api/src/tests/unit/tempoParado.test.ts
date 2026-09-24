import { describe, expect, it } from 'vitest';
import {
  calcularPercentualJornada,
  calcularTempoParado,
  calcularTempoTotal,
  emAlerta,
} from '../../domain/tempoParado.ts';
import { hora, paradasComTempos, PARAMETROS_EXEMPLO } from './fixtures.ts';

describe('calcularTempoParado', () => {
  it('partida (ordem 1) → null (RN01)', () => {
    expect(
      calcularTempoParado(
        { ordem: 1, chegadaEm: null, saidaEm: hora('08:00') },
        PARAMETROS_EXEMPLO,
      ),
    ).toBeNull();
  });

  it('08:20–08:35 → 15 min', () => {
    expect(
      calcularTempoParado(
        { ordem: 2, chegadaEm: hora('08:20'), saidaEm: hora('08:35') },
        PARAMETROS_EXEMPLO,
      ),
    ).toBe(15);
  });

  it('sem saída → null', () => {
    expect(
      calcularTempoParado(
        { ordem: 2, chegadaEm: hora('08:20'), saidaEm: null },
        PARAMETROS_EXEMPLO,
      ),
    ).toBeNull();
  });

  it('abaixo do tempo mínimo → 0 (RF10)', () => {
    const regras = { tempoMinimoParadaMin: 5 };
    expect(
      calcularTempoParado({ ordem: 3, chegadaEm: hora('09:00'), saidaEm: hora('09:03') }, regras),
    ).toBe(0);
    expect(
      calcularTempoParado({ ordem: 3, chegadaEm: hora('09:00'), saidaEm: hora('09:05') }, regras),
    ).toBe(5);
  });

  it('arredonda segundos para o minuto mais próximo (RN02)', () => {
    const chegada = hora('09:00');
    const saida = new Date(chegada.getTime() + (10 * 60 + 31) * 1000);
    expect(
      calcularTempoParado({ ordem: 2, chegadaEm: chegada, saidaEm: saida }, PARAMETROS_EXEMPLO),
    ).toBe(11);
  });
});

describe('calcularTempoTotal (RN03)', () => {
  const total = (tempos: number[]) =>
    calcularTempoTotal(
      paradasComTempos(tempos).map((p) => ({
        ordem: p.ordem,
        tempoParadoMin: calcularTempoParado(p, PARAMETROS_EXEMPLO),
      })),
    );

  it('roteiros A, B e C → 75, 41 e 45 min', () => {
    expect(total([15, 10, 50])).toBe(75);
    expect(total([10, 5, 26])).toBe(41);
    expect(total([5, 10, 30])).toBe(45);
  });

  it('ignora paradas não concluídas e a partida', () => {
    expect(
      calcularTempoTotal([
        { ordem: 1, tempoParadoMin: 99 },
        { ordem: 2, tempoParadoMin: 15 },
        { ordem: 3, tempoParadoMin: null },
      ]),
    ).toBe(15);
  });
});

describe('calcularPercentualJornada (RN04)', () => {
  it('75 min / 8 h → 15,63', () => {
    expect(calcularPercentualJornada(75, 8)).toBe(15.63);
  });

  it('roteiros B e C → 8,54 e 9,38', () => {
    expect(calcularPercentualJornada(41, 8)).toBe(8.54);
    expect(calcularPercentualJornada(45, 8)).toBe(9.38);
  });

  it('agregado: soma / (nº roteiros × jornada)', () => {
    expect(calcularPercentualJornada(75 + 41 + 45, 8, 3)).toBe(11.18);
  });
});

describe('emAlerta', () => {
  it('só acima do limite', () => {
    expect(emAlerta(60, 60)).toBe(false);
    expect(emAlerta(61, 60)).toBe(true);
    expect(emAlerta(null, 60)).toBe(false);
  });
});
