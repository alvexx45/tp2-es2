import { describe, expect, it } from 'vitest';
import { calcularCusto, calcularCustoPorKm } from '../../domain/custo.ts';
import { calcularDistancia, haversineKm } from '../../domain/distancia.ts';
import { arredondar } from '../../domain/numeros.ts';
import { COORDS_SEED, PARAMETROS_EXEMPLO } from './fixtures.ts';

describe('calcularDistancia (RN07)', () => {
  it('trechos do seed: 3,138 + 2,464 + 2,647 km', () => {
    expect(haversineKm(COORDS_SEED[0], COORDS_SEED[1])).toBeCloseTo(3.138, 3);
    expect(haversineKm(COORDS_SEED[1], COORDS_SEED[2])).toBeCloseTo(2.464, 3);
    expect(haversineKm(COORDS_SEED[2], COORDS_SEED[3])).toBeCloseTo(2.647, 3);
  });

  it('coordenadas do seed × fator 1,3 → 10,72 km', () => {
    expect(calcularDistancia(COORDS_SEED, 1.3)).toBe(10.72);
  });

  it('kmInformado tem prioridade → 12,5 km', () => {
    expect(calcularDistancia(COORDS_SEED, 1.3, 12.5)).toBe(12.5);
  });
});

describe('calcularCusto (RN07, RF11)', () => {
  it('exemplo 6.6 → custo por km R$ 0,70 e custo R$ 7,50', () => {
    expect(calcularCusto(10.72, PARAMETROS_EXEMPLO, 12)).toEqual({
      custoPorKm: 0.7,
      custoEstimado: 7.5,
    });
  });

  it('veículo sem km/L usa o padrão do parâmetro', () => {
    const parametros = { ...PARAMETROS_EXEMPLO, kmPorLitroPadrao: 10 };
    expect(calcularCustoPorKm(parametros, null)).toBeCloseTo(0.8, 10);
    expect(calcularCusto(10, parametros).custoEstimado).toBe(8);
  });
});

describe('arredondar', () => {
  it('half-up sem erro de ponto flutuante', () => {
    expect(arredondar(1.005, 2)).toBe(1.01);
    expect(arredondar(15.625, 2)).toBe(15.63);
    expect(arredondar(-1.005, 2)).toBe(-1.01);
  });
});
