import type { Prisma } from '@prisma/client';
import { emAlerta } from '../../domain/tempoParado.ts';
import { prisma } from '../../db/prisma.ts';
import { FUSO, hojeLocal, paraColunaData, somarDias } from '../../lib/datas.ts';
import { escopoRoteiros } from '../../lib/escopo.ts';
import { pagina, type Paginacao } from '../../lib/paginacao.ts';
import { dataISO } from '../../lib/serializar.ts';
import type { UsuarioAutenticado } from '../../lib/tipos.ts';
import { vigente } from '../parametros/parametros.service.ts';

export interface FiltrosHistorico {
  inicio?: string;
  fim?: string;
  motoristaId?: string;
  busca?: string;
  incluirPartida?: boolean;
}

/** Período padrão: últimos 30 dias. */
function periodo(f: FiltrosHistorico) {
  const fim = f.fim ?? hojeLocal();
  const inicio = f.inicio ?? somarDias(fim, -30);
  return { inicio, fim };
}

function filtro(u: UsuarioAutenticado, f: FiltrosHistorico): Prisma.PontoRoteiroWhereInput {
  const { inicio, fim } = periodo(f);
  return {
    ordem: f.incluirPartida ? undefined : { gt: 1 },
    roteiro: {
      AND: [
        escopoRoteiros(u),
        {
          status: { in: ['EM_ANDAMENTO', 'FINALIZADO'] },
          data: { gte: paraColunaData(inicio), lte: paraColunaData(fim) },
          motoristaId: f.motoristaId,
        },
      ],
    },
    ...(f.busca && {
      OR: [
        { ponto: { endereco: { contains: f.busca, mode: 'insensitive' } } },
        { ponto: { descricao: { contains: f.busca, mode: 'insensitive' } } },
        { codigoPedido: { contains: f.busca, mode: 'insensitive' } },
      ],
    }),
  };
}

const selecao = {
  id: true,
  ordem: true,
  codigoPedido: true,
  chegadaEm: true,
  saidaEm: true,
  tempoParadoMin: true,
  ponto: { select: { endereco: true } },
  roteiro: {
    select: {
      id: true,
      data: true,
      motorista: { select: { id: true, nome: true } },
      parametro: { select: { limiteAlertaParadaMin: true } },
    },
  },
} satisfies Prisma.PontoRoteiroSelect;

const ordenacao: Prisma.PontoRoteiroOrderByWithRelationInput[] = [
  { roteiro: { data: 'desc' } },
  { roteiro: { motorista: { nome: 'asc' } } },
  { ordem: 'asc' },
];

type Linha = Prisma.PontoRoteiroGetPayload<{ select: typeof selecao }>;

function item(l: Linha, limitePadrao: number) {
  const limite = l.roteiro.parametro?.limiteAlertaParadaMin ?? limitePadrao;
  return {
    paradaId: l.id,
    roteiroId: l.roteiro.id,
    data: dataISO(l.roteiro.data),
    motoristaId: l.roteiro.motorista.id,
    motorista: l.roteiro.motorista.nome,
    ordem: l.ordem,
    endereco: l.ponto.endereco,
    codigoPedido: l.codigoPedido,
    chegadaEm: l.chegadaEm,
    saidaEm: l.saidaEm,
    tempoParadoMin: l.ordem === 1 ? null : l.tempoParadoMin,
    alerta: emAlerta(l.tempoParadoMin, limite),
  };
}

/** Histórico de paradas (RF07 / UC12). */
export async function listar(u: UsuarioAutenticado, f: FiltrosHistorico & Paginacao) {
  const where = filtro(u, f);
  const [linhas, total, param] = await Promise.all([
    prisma.pontoRoteiro.findMany({
      where,
      select: selecao,
      orderBy: ordenacao,
      skip: (f.pagina - 1) * f.tamanho,
      take: f.tamanho,
    }),
    prisma.pontoRoteiro.count({ where }),
    vigente(),
  ]);
  return {
    ...pagina(
      linhas.map((l) => item(l, param.limiteAlertaParadaMin)),
      total,
      f,
    ),
    ...periodo(f),
  };
}

// ---------------------------------------------------------------------------------------------
// CSV (RF12 / UC14): separador ";" e UTF-8 com BOM para abrir corretamente no Excel.
// ---------------------------------------------------------------------------------------------

const LIMITE_CSV = 200_000;

const formatoDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  dateStyle: 'short',
  timeStyle: 'short',
});

function celula(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export async function exportarCsv(u: UsuarioAutenticado, f: FiltrosHistorico): Promise<string> {
  const linhas = await prisma.pontoRoteiro.findMany({
    where: filtro(u, f),
    select: selecao,
    orderBy: ordenacao,
    take: LIMITE_CSV,
  });
  const cabecalho = 'data;motorista;ordem;endereco;codigo_pedido;chegada;saida;tempo_parado_min';
  const corpo = linhas.map((l) => {
    const [a, m, d] = dataISO(l.roteiro.data).split('-');
    return [
      `${d}/${m}/${a}`,
      l.roteiro.motorista.nome,
      l.ordem,
      l.ponto.endereco,
      l.codigoPedido,
      l.chegadaEm ? formatoDataHora.format(l.chegadaEm) : '',
      l.saidaEm ? formatoDataHora.format(l.saidaEm) : '',
      l.ordem === 1 ? '' : l.tempoParadoMin,
    ]
      .map(celula)
      .join(';');
  });
  return `\uFEFF${[cabecalho, ...corpo].join('\r\n')}\r\n`;
}
