import { describe, expect, it } from 'vitest';
import {
  exigirHorarioLivre,
  exigirPlanejado,
  exigirRoteiroAberto,
  validarFinalizacao,
  validarParadasMontagem,
  validarSequenciaHorarios,
} from '../../domain/roteiro.ts';
import { hora, paradasComTempos } from './fixtures.ts';

const codigo = (fn: () => void) => {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as { codigo?: string }).codigo;
  }
};

const agora = hora('12:00');

describe('montagem (V1, V2, V9)', () => {
  it('V1: menos de 2 pontos', () => {
    expect(codigo(() => validarParadasMontagem([{ ordem: 1 }]))).toBe('ROTEIRO_MIN_PONTOS');
  });
  it('V2: ordens não contíguas ou repetidas', () => {
    expect(codigo(() => validarParadasMontagem([{ ordem: 1 }, { ordem: 3 }]))).toBe(
      'ORDEM_INVALIDA',
    );
    expect(codigo(() => validarParadasMontagem([{ ordem: 1 }, { ordem: 1 }]))).toBe(
      'ORDEM_INVALIDA',
    );
    expect(
      codigo(() => validarParadasMontagem([{ ordem: 2 }, { ordem: 1 }, { ordem: 3 }])),
    ).toBeNull();
  });
  it('V9: só PLANEJADO é editável', () => {
    expect(codigo(() => exigirPlanejado('EM_ANDAMENTO'))).toBe('ROTEIRO_EM_ANDAMENTO');
    expect(codigo(() => exigirPlanejado('PLANEJADO'))).toBeNull();
  });
});

describe('coleta (V4–V8)', () => {
  it('sequência válida do exemplo A passa', () => {
    expect(
      codigo(() => validarSequenciaHorarios(paradasComTempos([15, 10, 50]), agora)),
    ).toBeNull();
  });

  it('V4: chegada na partida', () => {
    expect(
      codigo(() => exigirHorarioLivre({ ordem: 1, chegadaEm: null, saidaEm: null }, 'chegada')),
    ).toBe('PARTIDA_SEM_CHEGADA');
    expect(
      codigo(() =>
        validarSequenciaHorarios(
          [{ ordem: 1, chegadaEm: hora('07:50'), saidaEm: hora('08:00') }],
          agora,
        ),
      ),
    ).toBe('PARTIDA_SEM_CHEGADA');
  });

  it('V5: chegada sem saída do ponto anterior', () => {
    const paradas = [
      { ordem: 1, chegadaEm: null, saidaEm: null },
      { ordem: 2, chegadaEm: hora('08:20'), saidaEm: null },
    ];
    expect(codigo(() => validarSequenciaHorarios(paradas, agora))).toBe('SEQUENCIA_INVALIDA');
  });

  it('V6: chegada antes da saída anterior e saída antes da chegada', () => {
    const a = [
      { ordem: 1, chegadaEm: null, saidaEm: hora('08:00') },
      { ordem: 2, chegadaEm: hora('07:59'), saidaEm: null },
    ];
    expect(codigo(() => validarSequenciaHorarios(a, agora))).toBe('HORARIO_INCONSISTENTE');
    const b = [
      { ordem: 1, chegadaEm: null, saidaEm: hora('08:00') },
      { ordem: 2, chegadaEm: hora('08:20'), saidaEm: hora('08:10') },
    ];
    expect(codigo(() => validarSequenciaHorarios(b, agora))).toBe('HORARIO_INCONSISTENTE');
  });

  it('V7: mais de 5 min no futuro', () => {
    const ok = [{ ordem: 1, chegadaEm: null, saidaEm: hora('12:05') }];
    const futuro = [{ ordem: 1, chegadaEm: null, saidaEm: hora('12:06') }];
    expect(codigo(() => validarSequenciaHorarios(ok, agora))).toBeNull();
    expect(codigo(() => validarSequenciaHorarios(futuro, agora))).toBe('HORARIO_FUTURO');
  });

  it('V8: roteiro fechado', () => {
    expect(codigo(() => exigirRoteiroAberto('FINALIZADO'))).toBe('ROTEIRO_FECHADO');
    expect(codigo(() => exigirRoteiroAberto('CANCELADO'))).toBe('ROTEIRO_FECHADO');
    expect(codigo(() => exigirRoteiroAberto('EM_ANDAMENTO'))).toBeNull();
  });

  it('não sobrescreve horário já registrado', () => {
    expect(
      codigo(() =>
        exigirHorarioLivre({ ordem: 2, chegadaEm: hora('08:20'), saidaEm: null }, 'chegada'),
      ),
    ).toBe('SEQUENCIA_INVALIDA');
  });
});

describe('finalização (V10)', () => {
  it('exige chegada e saída nas paradas de ordem > 1', () => {
    const paradas = paradasComTempos([15, 10]);
    paradas[2].saidaEm = null;
    expect(codigo(() => validarFinalizacao(paradas))).toBe('PONTOS_PENDENTES');
    expect(codigo(() => validarFinalizacao(paradasComTempos([15, 10])))).toBeNull();
  });
});
