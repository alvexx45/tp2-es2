import { Prisma, type StatusRoteiro } from '@prisma/client';
import { calcularCusto, calcularCustoPorKm } from '../../domain/custo.ts';
import { calcularDistancia } from '../../domain/distancia.ts';
import {
  exigirHorarioLivre,
  exigirPlanejado,
  exigirRoteiroAberto,
  validarFinalizacao,
  validarParadasMontagem,
  validarSequenciaHorarios,
} from '../../domain/roteiro.ts';
import {
  calcularPercentualJornada,
  calcularTempoParado,
  calcularTempoTotal,
  emAlerta,
} from '../../domain/tempoParado.ts';
import { prisma } from '../../db/prisma.ts';
import { hojeLocal, paraColunaData } from '../../lib/datas.ts';
import { conflito, ErroRegra, naoEncontrado } from '../../lib/erros.ts';
import { escopoMotoristas, escopoRoteiros } from '../../lib/escopo.ts';
import { pagina, paginar, type Paginacao } from '../../lib/paginacao.ts';
import { dataISO, num } from '../../lib/serializar.ts';
import type { UsuarioAutenticado } from '../../lib/tipos.ts';
import { registrar } from '../auditoria/auditoria.service.ts';
import { paraDominio, vigente } from '../parametros/parametros.service.ts';

type Tx = Prisma.TransactionClient;

const incluir = {
  motorista: { select: { id: true, nome: true, gerenteId: true } },
  gerente: { select: { id: true, nome: true } },
  veiculo: { select: { id: true, placa: true, modelo: true, tipo: true, kmPorLitro: true } },
  parametro: true,
  pontos: {
    orderBy: { ordem: 'asc' },
    include: {
      ponto: {
        select: { id: true, endereco: true, descricao: true, latitude: true, longitude: true },
      },
    },
  },
} satisfies Prisma.RoteiroInclude;

type RoteiroCompleto = Prisma.RoteiroGetPayload<{ include: typeof incluir }>;
type Parada = RoteiroCompleto['pontos'][number];

export interface ParadaEntrada {
  pontoId: string;
  ordem: number;
  codigoPedido?: string | null;
}

export interface DadosRoteiro {
  data: string;
  motoristaId: string;
  veiculoId?: string | null;
  paradas: ParadaEntrada[];
}

// ---------------------------------------------------------------------------------------------
// Serialização
// ---------------------------------------------------------------------------------------------

function serializarParada(p: Parada, limiteAlerta: number) {
  return {
    id: p.id,
    ordem: p.ordem,
    ponto: { ...p.ponto, latitude: num(p.ponto.latitude, 6), longitude: num(p.ponto.longitude, 6) },
    codigoPedido: p.codigoPedido,
    chegadaEm: p.chegadaEm,
    saidaEm: p.saidaEm,
    tempoParadoMin: p.tempoParadoMin,
    alerta: emAlerta(p.tempoParadoMin, limiteAlerta),
    latRegistro: num(p.latRegistro, 6),
    longRegistro: num(p.longRegistro, 6),
  };
}

async function serializar(r: RoteiroCompleto) {
  // Roteiro finalizado usa o snapshot de parâmetros; os demais, a versão vigente.
  const parametro = r.parametro ?? (await vigente());
  const p = paraDominio(parametro);
  return {
    id: r.id,
    data: dataISO(r.data),
    status: r.status,
    motorista: { id: r.motorista.id, nome: r.motorista.nome },
    gerente: r.gerente,
    veiculo: r.veiculo ? { ...r.veiculo, kmPorLitro: num(r.veiculo.kmPorLitro) } : null,
    kmInformado: num(r.kmInformado),
    distanciaTotalKm: num(r.distanciaTotalKm),
    tempoTotalParadoMin: r.tempoTotalParadoMin,
    custoEstimado: num(r.custoEstimado),
    custoPorKm: r.parametro ? num(calcularCustoPorKm(p, num(r.veiculo?.kmPorLitro))) : null,
    percentualJornada: num(r.percentualJornada),
    finalizadoEm: r.finalizadoEm,
    criadoEm: r.criadoEm,
    parametroId: r.parametroId,
    limiteAlertaParadaMin: p.limiteAlertaParadaMin,
    jornadaPadraoHoras: p.jornadaPadraoHoras,
    paradas: r.pontos.map((pr) => serializarParada(pr, p.limiteAlertaParadaMin)),
  };
}

/** Estado do roteiro para o log de auditoria (sem as relações). */
function estadoAuditavel(r: RoteiroCompleto) {
  return {
    data: dataISO(r.data),
    status: r.status,
    motoristaId: r.motoristaId,
    veiculoId: r.veiculoId,
    parametroId: r.parametroId,
    kmInformado: r.kmInformado,
    distanciaTotalKm: r.distanciaTotalKm,
    tempoTotalParadoMin: r.tempoTotalParadoMin,
    custoEstimado: r.custoEstimado,
    percentualJornada: r.percentualJornada,
    paradas: r.pontos.map((p) => ({
      ordem: p.ordem,
      pontoId: p.pontoId,
      codigoPedido: p.codigoPedido,
    })),
  };
}

function horariosParada(
  p: Pick<Parada, 'id' | 'ordem' | 'chegadaEm' | 'saidaEm' | 'tempoParadoMin'>,
) {
  return {
    ordem: p.ordem,
    chegadaEm: p.chegadaEm,
    saidaEm: p.saidaEm,
    tempoParadoMin: p.tempoParadoMin,
  };
}

// ---------------------------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------------------------

async function buscarNoEscopo(id: string, u: UsuarioAutenticado, tx: Tx | typeof prisma = prisma) {
  const r = await tx.roteiro.findFirst({ where: { id, ...escopoRoteiros(u) }, include: incluir });
  if (!r) throw naoEncontrado('Roteiro');
  return r;
}

export async function obter(id: string, u: UsuarioAutenticado) {
  return serializar(await buscarNoEscopo(id, u));
}

export interface FiltrosRoteiros extends Paginacao {
  data?: string;
  inicio?: string;
  fim?: string;
  motoristaId?: string;
  status?: StatusRoteiro;
}

function resumo(r: Prisma.RoteiroGetPayload<{ include: typeof incluirResumo }>) {
  const concluidas = r.pontos.filter((p) => p.ordem > 1 && p.saidaEm).length;
  return {
    id: r.id,
    data: dataISO(r.data),
    status: r.status,
    motorista: r.motorista,
    veiculo: r.veiculo,
    totalParadas: r.pontos.length - 1,
    paradasConcluidas: concluidas,
    tempoTotalParadoMin: r.tempoTotalParadoMin,
    distanciaTotalKm: num(r.distanciaTotalKm),
    custoEstimado: num(r.custoEstimado),
    percentualJornada: num(r.percentualJornada),
  };
}

const incluirResumo = {
  motorista: { select: { id: true, nome: true } },
  veiculo: { select: { id: true, placa: true, modelo: true } },
  pontos: { select: { ordem: true, saidaEm: true } },
} satisfies Prisma.RoteiroInclude;

export async function listar(u: UsuarioAutenticado, f: FiltrosRoteiros) {
  const where: Prisma.RoteiroWhereInput = {
    AND: [
      escopoRoteiros(u),
      {
        motoristaId: f.motoristaId,
        status: f.status,
        data: f.data
          ? paraColunaData(f.data)
          : f.inicio || f.fim
            ? {
                gte: f.inicio ? paraColunaData(f.inicio) : undefined,
                lte: f.fim ? paraColunaData(f.fim) : undefined,
              }
            : undefined,
      },
    ],
  };
  const [itens, total] = await Promise.all([
    prisma.roteiro.findMany({
      where,
      include: incluirResumo,
      orderBy: [{ data: 'desc' }, { motorista: { nome: 'asc' } }],
      ...paginar(f),
    }),
    prisma.roteiro.count({ where }),
  ]);
  return pagina(itens.map(resumo), total, f);
}

/** Roteiros do próprio motorista (UC11): por data (padrão hoje) ou por período, sem cancelados. */
export async function meus(u: UsuarioAutenticado, f: FiltrosRoteiros) {
  if (!f.inicio && !f.fim && !f.data) f.data = hojeLocal();
  const lista = await listar(u, { ...f, motoristaId: u.motoristaId });
  lista.itens = lista.itens.filter((r) => r.status !== 'CANCELADO');
  if (f.data) {
    // Roteiro do dia com as paradas completas (tela "Roteiro de hoje").
    const r = lista.itens[0];
    return { roteiro: r ? await obter(r.id, u) : null };
  }
  return lista;
}

// ---------------------------------------------------------------------------------------------
// Montagem (UC06) — V1, V2, V3, V9
// ---------------------------------------------------------------------------------------------

async function validarMontagem(
  dados: DadosRoteiro,
  u: UsuarioAutenticado,
  tx: Tx,
  ignorarRoteiroId?: string,
) {
  validarParadasMontagem(dados.paradas);

  const motorista = await tx.motorista.findFirst({
    where: { id: dados.motoristaId, ...escopoMotoristas(u) },
  });
  if (!motorista) throw naoEncontrado('Motorista');
  if (!motorista.ativo) throw new ErroRegra('MOTORISTA_INATIVO', 'O motorista está inativo.');

  const veiculoId = dados.veiculoId === undefined ? motorista.veiculoId : dados.veiculoId;
  if (veiculoId) {
    const veiculo = await tx.veiculo.findFirst({ where: { id: veiculoId, ativo: true } });
    if (!veiculo) throw new ErroRegra('VEICULO_INVALIDO', 'Veículo não encontrado ou inativo.');
  }

  const idsPontos = [...new Set(dados.paradas.map((p) => p.pontoId))];
  const ativos = await tx.ponto.count({ where: { id: { in: idsPontos }, ativo: true } });
  if (ativos !== idsPontos.length) {
    throw new ErroRegra('PONTO_INVALIDO', 'Um ou mais pontos não existem ou estão inativos.');
  }

  // V3 / RN05 — o índice único parcial no banco garante a regra também sob concorrência.
  const duplicado = await tx.roteiro.findFirst({
    where: {
      motoristaId: dados.motoristaId,
      data: paraColunaData(dados.data),
      status: { not: 'CANCELADO' },
      id: ignorarRoteiroId ? { not: ignorarRoteiroId } : undefined,
    },
  });
  if (duplicado) throw erroDuplicado();

  return { motorista, veiculoId };
}

function erroDuplicado() {
  return conflito('ROTEIRO_DUPLICADO', 'Este motorista já tem um roteiro nesta data.');
}

/** Converte violação do índice único parcial (RN05) em ROTEIRO_DUPLICADO. */
async function comRN05<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
      throw erroDuplicado();
    throw e;
  }
}

function paradasParaCriar(roteiroId: string, paradas: ParadaEntrada[]) {
  return paradas.map((p) => ({
    roteiroId,
    pontoId: p.pontoId,
    ordem: p.ordem,
    codigoPedido: p.codigoPedido || null,
  }));
}

export async function criar(dados: DadosRoteiro, u: UsuarioAutenticado) {
  const id = await comRN05(() =>
    prisma.$transaction(async (tx) => {
      const { motorista, veiculoId } = await validarMontagem(dados, u, tx);
      const r = await tx.roteiro.create({
        data: {
          data: paraColunaData(dados.data),
          motoristaId: motorista.id,
          gerenteId: motorista.gerenteId,
          veiculoId,
        },
      });
      await tx.pontoRoteiro.createMany({ data: paradasParaCriar(r.id, dados.paradas) });
      const completo = await tx.roteiro.findUniqueOrThrow({
        where: { id: r.id },
        include: incluir,
      });
      await registrar(tx, {
        entidade: 'Roteiro',
        entidadeId: r.id,
        acao: 'CRIACAO',
        valorNovo: estadoAuditavel(completo),
        usuarioId: u.id,
      });
      return r.id;
    }),
  );
  return obter(id, u);
}

export async function atualizar(id: string, dados: DadosRoteiro, u: UsuarioAutenticado) {
  await comRN05(() =>
    prisma.$transaction(async (tx) => {
      const anterior = await buscarNoEscopo(id, u, tx);
      exigirPlanejado(anterior.status);
      const { motorista, veiculoId } = await validarMontagem(dados, u, tx, id);
      // Roteiro planejado ainda não tem horários: a lista de paradas é substituída.
      await tx.pontoRoteiro.deleteMany({ where: { roteiroId: id } });
      await tx.roteiro.update({
        where: { id },
        data: {
          data: paraColunaData(dados.data),
          motoristaId: motorista.id,
          gerenteId: motorista.gerenteId,
          veiculoId,
        },
      });
      await tx.pontoRoteiro.createMany({ data: paradasParaCriar(id, dados.paradas) });
      const novo = await tx.roteiro.findUniqueOrThrow({ where: { id }, include: incluir });
      await registrar(tx, {
        entidade: 'Roteiro',
        entidadeId: id,
        acao: 'ALTERACAO',
        valorAnterior: estadoAuditavel(anterior),
        valorNovo: estadoAuditavel(novo),
        usuarioId: u.id,
      });
    }),
  );
  return obter(id, u);
}

export async function cancelar(id: string, u: UsuarioAutenticado) {
  await prisma.$transaction(async (tx) => {
    const anterior = await buscarNoEscopo(id, u, tx);
    if (anterior.status !== 'PLANEJADO') {
      throw new ErroRegra(
        'ROTEIRO_EM_ANDAMENTO',
        'Só é possível cancelar um roteiro que ainda não começou.',
      );
    }
    await tx.roteiro.update({ where: { id }, data: { status: 'CANCELADO' } });
    await registrar(tx, {
      entidade: 'Roteiro',
      entidadeId: id,
      acao: 'ALTERACAO',
      valorAnterior: { status: anterior.status },
      valorNovo: { status: 'CANCELADO' },
      usuarioId: u.id,
    });
  });
  return obter(id, u);
}

// ---------------------------------------------------------------------------------------------
// Recalcular (RN01–RN04, RN07)
// ---------------------------------------------------------------------------------------------

/**
 * Recalcula o tempo parado de todas as paradas e os totais do roteiro, gravando o que mudou.
 * Com `finalizado`, também recalcula distância, custo e % da jornada (usando o snapshot `parametro`).
 */
async function recalcular(
  tx: Tx,
  r: RoteiroCompleto,
  paradas: Pick<Parada, 'id' | 'ordem' | 'chegadaEm' | 'saidaEm' | 'tempoParadoMin'>[],
  parametro: ReturnType<typeof paraDominio>,
  finalizado: { kmInformado: number | null } | null,
) {
  const recalculadas = paradas.map((p) => ({
    ...p,
    tempoParadoMin: calcularTempoParado(p, parametro),
  }));
  for (const p of recalculadas) {
    const original = paradas.find((x) => x.id === p.id);
    if (original?.tempoParadoMin !== p.tempoParadoMin) {
      await tx.pontoRoteiro.update({
        where: { id: p.id },
        data: { tempoParadoMin: p.tempoParadoMin },
      });
    }
  }
  const tempoTotalParadoMin = calcularTempoTotal(recalculadas);
  const dados: Prisma.RoteiroUpdateInput = { tempoTotalParadoMin };

  if (finalizado) {
    const coordenadas = r.pontos.map((p) => ({
      latitude: Number(p.ponto.latitude),
      longitude: Number(p.ponto.longitude),
    }));
    const distancia = calcularDistancia(
      coordenadas,
      parametro.fatorCorrecaoRota,
      finalizado.kmInformado,
    );
    const { custoEstimado } = calcularCusto(distancia, parametro, num(r.veiculo?.kmPorLitro));
    Object.assign(dados, {
      kmInformado: finalizado.kmInformado,
      distanciaTotalKm: distancia,
      custoEstimado,
      percentualJornada: calcularPercentualJornada(
        tempoTotalParadoMin,
        parametro.jornadaPadraoHoras,
      ),
    });
  }
  await tx.roteiro.update({ where: { id: r.id }, data: dados });
  return { tempoTotalParadoMin, paradas: recalculadas };
}

// ---------------------------------------------------------------------------------------------
// Coleta (UC07) — V4–V8
// ---------------------------------------------------------------------------------------------

export interface DadosRegistro {
  dataHora?: Date;
  latitude?: number;
  longitude?: number;
}

export async function registrarHorario(
  id: string,
  paradaId: string,
  tipo: 'chegada' | 'saida',
  dados: DadosRegistro,
  u: UsuarioAutenticado,
) {
  const agora = new Date();
  const dataHora = dados.dataHora ?? agora;

  const resultado = await prisma.$transaction(async (tx) => {
    const r = await buscarNoEscopo(id, u, tx);
    exigirRoteiroAberto(r.status);
    const parada = r.pontos.find((p) => p.id === paradaId);
    if (!parada) throw naoEncontrado('Parada');
    exigirHorarioLivre(parada, tipo);

    const campo = tipo === 'chegada' ? 'chegadaEm' : 'saidaEm';
    const paradas = r.pontos.map((p) => (p.id === paradaId ? { ...p, [campo]: dataHora } : p));
    validarSequenciaHorarios(paradas, agora);

    // Grava só se o horário ainda estiver vazio (protege contra dois toques simultâneos).
    const gravou = await tx.pontoRoteiro.updateMany({
      where: { id: paradaId, [campo]: null },
      data: {
        [campo]: dataHora,
        ...(parada.latRegistro === null &&
          dados.latitude !== undefined &&
          dados.longitude !== undefined && {
            latRegistro: dados.latitude,
            longRegistro: dados.longitude,
          }),
      },
    });
    if (gravou.count === 0) {
      throw new ErroRegra('SEQUENCIA_INVALIDA', 'Este horário acabou de ser registrado.', 422);
    }
    if (r.status === 'PLANEJADO') {
      await tx.roteiro.update({ where: { id }, data: { status: 'EM_ANDAMENTO' } });
    }

    const parametro = paraDominio(await vigente(tx));
    const { tempoTotalParadoMin, paradas: recalculadas } = await recalcular(
      tx,
      r,
      paradas,
      parametro,
      null,
    );
    const atualizada = recalculadas.find((p) => p.id === paradaId)!;

    await registrar(tx, {
      entidade: 'PontoRoteiro',
      entidadeId: paradaId,
      acao: 'ALTERACAO',
      valorAnterior: horariosParada(parada),
      valorNovo: { ...horariosParada(atualizada), origem: `registro de ${tipo}` },
      usuarioId: u.id,
    });
    return { tempoTotalParadoMin, limite: parametro.limiteAlertaParadaMin };
  });

  const r = await buscarNoEscopo(id, u);
  const parada = r.pontos.find((p) => p.id === paradaId)!;
  return {
    ...serializarParada(parada, resultado.limite),
    tempoTotalParadoMin: resultado.tempoTotalParadoMin,
    statusRoteiro: r.status,
  };
}

// ---------------------------------------------------------------------------------------------
// Correção de horário (gerente/admin, auditada — RF05, RNF05)
// ---------------------------------------------------------------------------------------------

export async function corrigirHorario(
  id: string,
  paradaId: string,
  dados: { chegadaEm?: Date | null; saidaEm?: Date | null },
  u: UsuarioAutenticado,
) {
  await prisma.$transaction(async (tx) => {
    const r = await buscarNoEscopo(id, u, tx);
    if (r.status === 'CANCELADO') {
      throw new ErroRegra('ROTEIRO_FECHADO', 'Roteiro cancelado não aceita registros.');
    }
    const parada = r.pontos.find((p) => p.id === paradaId);
    if (!parada) throw naoEncontrado('Parada');

    const corrigida = {
      ...parada,
      chegadaEm: dados.chegadaEm === undefined ? parada.chegadaEm : dados.chegadaEm,
      saidaEm: dados.saidaEm === undefined ? parada.saidaEm : dados.saidaEm,
    };
    const paradas = r.pontos.map((p) => (p.id === paradaId ? corrigida : p));
    validarSequenciaHorarios(paradas, new Date());
    if (r.status === 'FINALIZADO') validarFinalizacao(paradas);

    await tx.pontoRoteiro.update({
      where: { id: paradaId },
      data: { chegadaEm: corrigida.chegadaEm, saidaEm: corrigida.saidaEm },
    });
    const temHorario = paradas.some((p) => p.chegadaEm || p.saidaEm);
    if (r.status === 'PLANEJADO' && temHorario) {
      await tx.roteiro.update({ where: { id }, data: { status: 'EM_ANDAMENTO' } });
    }

    // Roteiro finalizado é recalculado com o MESMO snapshot de parâmetros (Seção 6.8).
    const finalizado = r.status === 'FINALIZADO' && r.parametro;
    const parametro = paraDominio(finalizado ? r.parametro! : await vigente(tx));
    const { paradas: recalculadas } = await recalcular(
      tx,
      r,
      paradas,
      parametro,
      finalizado ? { kmInformado: num(r.kmInformado) } : null,
    );
    const atualizada = recalculadas.find((p) => p.id === paradaId)!;

    await registrar(tx, {
      entidade: 'PontoRoteiro',
      entidadeId: paradaId,
      acao: 'ALTERACAO',
      valorAnterior: horariosParada(parada),
      valorNovo: { ...horariosParada(atualizada), origem: 'correção de horário' },
      usuarioId: u.id,
    });
    if (finalizado) {
      const novo = await tx.roteiro.findUniqueOrThrow({ where: { id }, include: incluir });
      await registrar(tx, {
        entidade: 'Roteiro',
        entidadeId: id,
        acao: 'ALTERACAO',
        valorAnterior: estadoAuditavel(r),
        valorNovo: estadoAuditavel(novo),
        usuarioId: u.id,
      });
    }
  });
  return obter(id, u);
}

// ---------------------------------------------------------------------------------------------
// Finalização e custo (UC09/UC10, RF11) — V10
// ---------------------------------------------------------------------------------------------

export async function finalizar(
  id: string,
  dados: { kmInformado?: number | null },
  u: UsuarioAutenticado,
) {
  await prisma.$transaction(async (tx) => {
    const r = await buscarNoEscopo(id, u, tx);
    exigirRoteiroAberto(r.status);
    validarFinalizacao(r.pontos);

    // Snapshot: o roteiro guarda a versão de parâmetros usada no cálculo.
    const parametro = await vigente(tx);
    await recalcular(tx, r, r.pontos, paraDominio(parametro), {
      kmInformado: dados.kmInformado ?? null,
    });
    const gravou = await tx.roteiro.updateMany({
      where: { id, status: { in: ['PLANEJADO', 'EM_ANDAMENTO'] } },
      data: { status: 'FINALIZADO', parametroId: parametro.id, finalizadoEm: new Date() },
    });
    if (gravou.count === 0) exigirRoteiroAberto('FINALIZADO');

    const novo = await tx.roteiro.findUniqueOrThrow({ where: { id }, include: incluir });
    await registrar(tx, {
      entidade: 'Roteiro',
      entidadeId: id,
      acao: 'ALTERACAO',
      valorAnterior: estadoAuditavel(r),
      valorNovo: estadoAuditavel(novo),
      usuarioId: u.id,
    });
  });
  return obter(id, u);
}
