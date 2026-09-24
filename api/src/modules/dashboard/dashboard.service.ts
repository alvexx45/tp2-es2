import { Prisma } from '@prisma/client';
import { calcularPercentualJornada } from '../../domain/tempoParado.ts';
import { prisma } from '../../db/prisma.ts';
import { deColunaData, paraColunaData, somarDias } from '../../lib/datas.ts';
import { ErroRegra } from '../../lib/erros.ts';
import { num } from '../../lib/serializar.ts';
import type { UsuarioAutenticado } from '../../lib/tipos.ts';
import { vigente } from '../parametros/parametros.service.ts';

/**
 * Dashboard (RF08, RN04, RNF03). Todas as agregações são feitas no PostgreSQL (GROUP BY) com
 * `$queryRaw` parametrizado — este é o único módulo que usa SQL direto (Seção 3.1).
 * Considera roteiros EM_ANDAMENTO/FINALIZADO e paradas com tempo calculado (ordem > 1).
 */

const MAX_DIAS_PERIODO = 366;
const DIAS_PARA_AGRUPAR_POR_MES = 62;

interface Contexto {
  inicio: string;
  fim: string;
  motoristaId: string | null;
  u: UsuarioAutenticado;
  /** Valores vigentes, usados para roteiros ainda sem snapshot de parâmetros. */
  jornadaHoras: number;
  limiteAlerta: number;
}

async function contexto(
  u: UsuarioAutenticado,
  inicio: string,
  fim: string,
  motoristaId?: string,
): Promise<Contexto> {
  const p = await vigente();
  return {
    inicio,
    fim,
    motoristaId: motoristaId ?? null,
    u,
    jornadaHoras: Number(p.jornadaPadraoHoras),
    limiteAlerta: p.limiteAlertaParadaMin,
  };
}

/** FROM/JOIN comuns + filtros de período, status, motorista e escopo do perfil. */
function origem(c: Contexto, comParadas: boolean) {
  const escopo =
    c.u.perfil === 'GERENTE'
      ? Prisma.sql`AND m.gerente_id = ${c.u.gerenteId ?? null}::uuid`
      : c.u.perfil === 'MOTORISTA'
        ? Prisma.sql`AND r.motorista_id = ${c.u.motoristaId ?? null}::uuid`
        : Prisma.empty;
  const paradas = comParadas
    ? Prisma.sql`JOIN pontos_roteiro pr ON pr.roteiro_id = r.id
                 JOIN pontos pt ON pt.id = pr.ponto_id`
    : Prisma.empty;
  const filtroParadas = comParadas
    ? Prisma.sql`AND pr.ordem > 1 AND pr.tempo_parado_min IS NOT NULL`
    : Prisma.empty;
  return Prisma.sql`
    FROM roteiros r
    JOIN motoristas m ON m.id = r.motorista_id
    LEFT JOIN parametros_sistema p ON p.id = r.parametro_id
    ${paradas}
    WHERE r.data BETWEEN ${c.inicio}::date AND ${c.fim}::date
      AND r.status IN ('EM_ANDAMENTO', 'FINALIZADO')
      AND (${c.motoristaId}::uuid IS NULL OR r.motorista_id = ${c.motoristaId}::uuid)
      ${escopo}
      ${filtroParadas}`;
}

const alerta = (c: Contexto) =>
  Prisma.sql`pr.tempo_parado_min > COALESCE(p.limite_alerta_parada_min, ${c.limiteAlerta})`;
const minutosJornada = (c: Contexto) =>
  Prisma.sql`COALESCE(p.jornada_padrao_horas, ${c.jornadaHoras}) * 60`;

// ---------------------------------------------------------------------------------------------
// Cards (tempo total, % jornada, nº de paradas, km, custo)
// ---------------------------------------------------------------------------------------------

async function cards(c: Contexto) {
  const [[roteiros], [paradas]] = await Promise.all([
    prisma.$queryRaw<{ roteiros: number; km: number; custo: number; minutos_jornada: number }[]>`
      SELECT COUNT(*)::int                                  AS roteiros,
             COALESCE(SUM(r.distancia_total_km), 0)::float8 AS km,
             COALESCE(SUM(r.custo_estimado), 0)::float8     AS custo,
             COALESCE(SUM(${minutosJornada(c)}), 0)::float8 AS minutos_jornada
      ${origem(c, false)}`,
    prisma.$queryRaw<{ paradas: number; tempo: number; alertas: number }[]>`
      SELECT COUNT(pr.id)::int                             AS paradas,
             COALESCE(SUM(pr.tempo_parado_min), 0)::int    AS tempo,
             COUNT(*) FILTER (WHERE ${alerta(c)})::int     AS alertas
      ${origem(c, true)}`,
  ]);
  return {
    tempoTotalParadoMin: paradas.tempo,
    percentualJornada: percentual(paradas.tempo, roteiros.minutos_jornada),
    paradas: paradas.paradas,
    alertas: paradas.alertas,
    roteiros: roteiros.roteiros,
    distanciaKm: num(roteiros.km),
    custoEstimado: num(roteiros.custo),
  };
}

/** RN04 agregado: Σ tempo parado / Σ minutos de jornada dos roteiros considerados × 100. */
function percentual(tempoMin: number, minutosJornada: number): number {
  return minutosJornada > 0 ? calcularPercentualJornada(tempoMin, minutosJornada / 60) : 0;
}

// ---------------------------------------------------------------------------------------------
// Série temporal (por dia ou por mês) com a maior parada de cada ponto para o tooltip
// ---------------------------------------------------------------------------------------------

async function serie(c: Contexto, agrupamento: 'dia' | 'mes') {
  // Expressão fixa (não vem do usuário), por isso pode ser Prisma.raw.
  const bucket = Prisma.raw(agrupamento === 'mes' ? `date_trunc('month', r.data)::date` : 'r.data');

  const [paradas, jornadas, maiores] = await Promise.all([
    prisma.$queryRaw<
      { bucket: Date; tempo: number; roteiros: number; paradas: number; alertas: number }[]
    >`
      SELECT ${bucket}                                    AS bucket,
             SUM(pr.tempo_parado_min)::int                AS tempo,
             COUNT(DISTINCT r.id)::int                    AS roteiros,
             COUNT(pr.id)::int                            AS paradas,
             COUNT(*) FILTER (WHERE ${alerta(c)})::int    AS alertas
      ${origem(c, true)}
      GROUP BY 1
      ORDER BY 1`,
    prisma.$queryRaw<{ bucket: Date; minutos_jornada: number }[]>`
      SELECT ${bucket} AS bucket, SUM(${minutosJornada(c)})::float8 AS minutos_jornada
      ${origem(c, false)}
      GROUP BY 1`,
    prisma.$queryRaw<
      {
        bucket: Date;
        endereco: string;
        motorista: string;
        chegada_em: Date;
        saida_em: Date;
        tempo: number;
      }[]
    >`
      SELECT DISTINCT ON (1) ${bucket} AS bucket, pt.endereco, m.nome AS motorista,
             pr.chegada_em, pr.saida_em, pr.tempo_parado_min AS tempo
      ${origem(c, true)}
      ORDER BY 1, pr.tempo_parado_min DESC, pr.chegada_em`,
  ]);

  const jornadaPorBucket = new Map(
    jornadas.map((j) => [deColunaData(j.bucket), j.minutos_jornada]),
  );
  const maiorPorBucket = new Map(maiores.map((m) => [deColunaData(m.bucket), m]));
  const porBucket = new Map(paradas.map((p) => [deColunaData(p.bucket), p]));

  // Preenche dias/meses sem registro com zero, para o eixo do gráfico ficar contínuo.
  const chaves: string[] = [];
  if (agrupamento === 'dia') {
    for (let d = c.inicio; d <= c.fim; d = somarDias(d, 1)) chaves.push(d);
  } else {
    for (let d = `${c.inicio.slice(0, 7)}-01`; d <= c.fim; d = proximoMes(d)) chaves.push(d);
  }

  return chaves.map((chave) => {
    const p = porBucket.get(chave);
    const maior = maiorPorBucket.get(chave);
    const tempo = p?.tempo ?? 0;
    return {
      data: chave,
      tempoParadoMin: tempo,
      roteiros: p?.roteiros ?? 0,
      paradas: p?.paradas ?? 0,
      alertas: p?.alertas ?? 0,
      percentualJornada: percentual(tempo, jornadaPorBucket.get(chave) ?? 0),
      maiorParada: maior
        ? {
            endereco: maior.endereco,
            motorista: maior.motorista,
            chegadaEm: maior.chegada_em,
            saidaEm: maior.saida_em,
            tempoParadoMin: maior.tempo,
          }
        : null,
    };
  });
}

function proximoMes(data: string): string {
  const d = paraColunaData(data);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return deColunaData(d);
}

// ---------------------------------------------------------------------------------------------
// Recortes
// ---------------------------------------------------------------------------------------------

/** Recorte "Dia": cards + cada parada (endereço, chegada, saída, tempo, alerta), agrupadas por motorista. */
export async function dia(u: UsuarioAutenticado, data: string, motoristaId?: string) {
  const c = await contexto(u, data, data, motoristaId);
  const [resumo, paradas] = await Promise.all([
    cards(c),
    prisma.$queryRaw<
      {
        roteiro_id: string;
        motorista_id: string;
        motorista: string;
        parada_id: string;
        ordem: number;
        endereco: string;
        codigo_pedido: string | null;
        chegada_em: Date;
        saida_em: Date;
        tempo: number;
        alerta: boolean;
      }[]
    >`
      SELECT r.id AS roteiro_id, m.id AS motorista_id, m.nome AS motorista, pr.id AS parada_id, pr.ordem,
             pt.endereco, pr.codigo_pedido, pr.chegada_em, pr.saida_em, pr.tempo_parado_min AS tempo,
             (${alerta(c)}) AS alerta
      ${origem(c, true)}
      ORDER BY m.nome, pr.ordem`,
  ]);
  return {
    recorte: 'dia' as const,
    data,
    cards: resumo,
    paradas: paradas.map((p) => ({
      roteiroId: p.roteiro_id,
      motoristaId: p.motorista_id,
      motorista: p.motorista,
      paradaId: p.parada_id,
      ordem: p.ordem,
      endereco: p.endereco,
      codigoPedido: p.codigo_pedido,
      chegadaEm: p.chegada_em,
      saidaEm: p.saida_em,
      tempoParadoMin: p.tempo,
      alerta: p.alerta,
    })),
  };
}

/** Recorte "Mês": cards + tempo parado e % da jornada por dia do mês. */
export async function mes(
  u: UsuarioAutenticado,
  ano: number,
  mesNumero: number,
  motoristaId?: string,
) {
  const inicio = `${ano}-${String(mesNumero).padStart(2, '0')}-01`;
  const fim = somarDias(proximoMes(inicio), -1);
  const c = await contexto(u, inicio, fim, motoristaId);
  const [resumo, dias] = await Promise.all([cards(c), serie(c, 'dia')]);
  return { recorte: 'mes' as const, ano, mes: mesNumero, inicio, fim, cards: resumo, serie: dias };
}

/** Recorte "Período" (até 366 dias): série por dia (ou por mês acima de 62 dias) + ranking de endereços. */
export async function periodo(
  u: UsuarioAutenticado,
  inicio: string,
  fim: string,
  motoristaId?: string,
) {
  const dias = (paraColunaData(fim).getTime() - paraColunaData(inicio).getTime()) / 86_400_000 + 1;
  if (dias < 1)
    throw new ErroRegra('PERIODO_INVALIDO', 'A data inicial deve ser anterior ou igual à final.');
  if (dias > MAX_DIAS_PERIODO) {
    throw new ErroRegra(
      'PERIODO_INVALIDO',
      `O período pode ter no máximo ${MAX_DIAS_PERIODO} dias.`,
    );
  }
  const agrupamento = dias > DIAS_PARA_AGRUPAR_POR_MES ? 'mes' : 'dia';
  const c = await contexto(u, inicio, fim, motoristaId);

  const [resumo, pontos, ranking] = await Promise.all([
    cards(c),
    serie(c, agrupamento),
    prisma.$queryRaw<
      {
        ponto_id: string;
        endereco: string;
        media: number;
        visitas: number;
        total: number;
        ultima: Date;
      }[]
    >`
      SELECT pt.id AS ponto_id, pt.endereco,
             AVG(pr.tempo_parado_min)::float8     AS media,
             COUNT(*)::int                        AS visitas,
             SUM(pr.tempo_parado_min)::int        AS total,
             MAX(pr.saida_em)                     AS ultima
      ${origem(c, true)}
      GROUP BY pt.id, pt.endereco
      ORDER BY media DESC, total DESC
      LIMIT 10`,
  ]);

  return {
    recorte: 'periodo' as const,
    inicio,
    fim,
    agrupamento,
    cards: resumo,
    serie: pontos,
    ranking: ranking.map((r) => ({
      pontoId: r.ponto_id,
      endereco: r.endereco,
      tempoMedioMin: num(r.media, 1),
      visitas: r.visitas,
      tempoTotalMin: r.total,
      ultimaVisitaEm: r.ultima,
    })),
  };
}
