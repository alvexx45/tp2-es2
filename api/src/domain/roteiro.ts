import { ErroRegra } from './erros.ts';
import type { ParadaHorarios } from './tempoParado.ts';

export type StatusRoteiro = 'PLANEJADO' | 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';

/** Tolerância para relógios dessincronizados (V7). */
export const TOLERANCIA_FUTURO_MS = 5 * 60 * 1000;

/** V1 e V2 — montagem do roteiro. */
export function validarParadasMontagem(paradas: { ordem: number }[]): void {
  if (paradas.length < 2) {
    throw new ErroRegra(
      'ROTEIRO_MIN_PONTOS',
      'O roteiro precisa de pelo menos 2 pontos (partida e uma parada).',
    );
  }
  const ordens = paradas.map((p) => p.ordem).sort((a, b) => a - b);
  const contiguas = ordens.every((ordem, i) => ordem === i + 1);
  if (!contiguas) {
    throw new ErroRegra(
      'ORDEM_INVALIDA',
      'As ordens devem ser 1..n, contíguas e sem repetição.',
      422,
      {
        ordens,
      },
    );
  }
}

/** V9 — só roteiro PLANEJADO tem a lista de pontos editável (e pode ser cancelado). */
export function exigirPlanejado(status: StatusRoteiro): void {
  if (status !== 'PLANEJADO') {
    throw new ErroRegra(
      'ROTEIRO_EM_ANDAMENTO',
      'Só é possível alterar os pontos de um roteiro ainda planejado.',
    );
  }
}

/** V8 — roteiro finalizado ou cancelado não aceita registro do motorista. */
export function exigirRoteiroAberto(status: StatusRoteiro): void {
  if (status === 'FINALIZADO' || status === 'CANCELADO') {
    throw new ErroRegra(
      'ROTEIRO_FECHADO',
      'Este roteiro já foi encerrado e não aceita novos registros.',
    );
  }
}

/**
 * V4–V7 — valida a sequência completa de horários de um roteiro (paradas em qualquer ordem).
 * Usada depois de aplicar um registro de chegada/saída ou uma correção de horário.
 */
export function validarSequenciaHorarios(paradas: ParadaHorarios[], agora: Date): void {
  const emOrdem = [...paradas].sort((a, b) => a.ordem - b.ordem);
  const limiteFuturo = agora.getTime() + TOLERANCIA_FUTURO_MS;

  emOrdem.forEach((p, i) => {
    const anterior = i > 0 ? emOrdem[i - 1] : null;

    if (
      (p.chegadaEm && p.chegadaEm.getTime() > limiteFuturo) ||
      (p.saidaEm && p.saidaEm.getTime() > limiteFuturo)
    ) {
      throw new ErroRegra(
        'HORARIO_FUTURO',
        'O horário não pode estar mais de 5 minutos no futuro.',
        422,
        {
          ordem: p.ordem,
        },
      );
    }

    if (p.ordem === 1) {
      if (p.chegadaEm) {
        throw new ErroRegra(
          'PARTIDA_SEM_CHEGADA',
          'No ponto de partida registra-se apenas o horário de saída.',
        );
      }
      return;
    }

    if (p.saidaEm && !p.chegadaEm) {
      throw new ErroRegra('SEQUENCIA_INVALIDA', 'Registre a chegada antes da saída.', 422, {
        ordem: p.ordem,
      });
    }
    if (p.chegadaEm && !anterior?.saidaEm) {
      throw new ErroRegra(
        'SEQUENCIA_INVALIDA',
        'Registre a saída do ponto anterior antes da chegada neste ponto.',
        422,
        { ordem: p.ordem },
      );
    }
    if (p.chegadaEm && anterior?.saidaEm && p.chegadaEm < anterior.saidaEm) {
      throw new ErroRegra(
        'HORARIO_INCONSISTENTE',
        'A chegada não pode ser anterior à saída do ponto anterior.',
        422,
        { ordem: p.ordem },
      );
    }
    if (p.chegadaEm && p.saidaEm && p.saidaEm < p.chegadaEm) {
      throw new ErroRegra(
        'HORARIO_INCONSISTENTE',
        'A saída não pode ser anterior à chegada.',
        422,
        {
          ordem: p.ordem,
        },
      );
    }
  });
}

/** V10 — finalizar exige chegada e saída em todos os pontos de ordem > 1. */
export function validarFinalizacao(paradas: ParadaHorarios[]): void {
  const pendentes = paradas
    .filter((p) => p.ordem > 1 && (!p.chegadaEm || !p.saidaEm))
    .map((p) => p.ordem);
  if (pendentes.length > 0) {
    throw new ErroRegra(
      'PONTOS_PENDENTES',
      'Registre chegada e saída em todas as paradas antes de finalizar.',
      422,
      { ordens: pendentes.sort((a, b) => a - b) },
    );
  }
}

/** Registro do motorista: não sobrescreve horário já registrado (correções são do gerente/admin). */
export function exigirHorarioLivre(parada: ParadaHorarios, tipo: 'chegada' | 'saida'): void {
  if (tipo === 'chegada' && parada.ordem === 1) {
    throw new ErroRegra(
      'PARTIDA_SEM_CHEGADA',
      'No ponto de partida registra-se apenas o horário de saída.',
    );
  }
  const atual = tipo === 'chegada' ? parada.chegadaEm : parada.saidaEm;
  if (atual) {
    throw new ErroRegra(
      'SEQUENCIA_INVALIDA',
      `A ${tipo === 'chegada' ? 'chegada' : 'saída'} deste ponto já foi registrada.`,
      422,
      { ordem: parada.ordem },
    );
  }
}
