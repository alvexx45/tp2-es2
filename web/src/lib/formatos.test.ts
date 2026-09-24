import { describe, expect, it } from 'vitest';
import {
  deInputDataHora,
  formatarData,
  formatarDuracao,
  formatarHora,
  formatarMoeda,
  paraInputDataHora,
} from './formatos.ts';

describe('formatos (Seção 10)', () => {
  it('duração como "1 h 15 min"', () => {
    expect(formatarDuracao(75)).toBe('1 h 15 min');
    expect(formatarDuracao(45)).toBe('45 min');
    expect(formatarDuracao(120)).toBe('2 h');
    expect(formatarDuracao(null)).toBe('—');
  });

  it('data dd/mm/aaaa', () => {
    expect(formatarData('2026-09-24')).toBe('24/09/2026');
  });

  it('moeda R$ 7,50', () => {
    expect(formatarMoeda(7.5)).toBe('R$ 7,50');
  });

  it('hora no fuso de São Paulo', () => {
    expect(formatarHora('2026-09-24T11:20:00Z')).toBe('08:20');
  });

  it('ida e volta do datetime-local', () => {
    expect(paraInputDataHora('2026-09-24T11:20:00.000Z')).toBe('2026-09-24T08:20');
    expect(deInputDataHora('2026-09-24T08:20')).toBe('2026-09-24T08:20:00-03:00');
  });
});
