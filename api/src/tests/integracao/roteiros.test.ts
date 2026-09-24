import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../db/prisma.ts';
import { hojeLocal, somarDias } from '../../lib/datas.ts';
import { ADMIN, app, auth, GERENTE, JOAO } from './helpers.ts';

const hoje = hojeLocal();
const minutosAtras = (min: number) => new Date(Date.now() - min * 60000).toISOString();

let pontos: { id: string; endereco: string }[];
let joaoId: string;
let mariaId: string;

beforeAll(async () => {
  pontos = await prisma.ponto.findMany({
    where: { descricao: { in: ['P1', 'P2', 'P3', 'P4'] } },
    orderBy: { descricao: 'asc' },
  });
  joaoId = (await prisma.motorista.findFirstOrThrow({ where: { nome: 'João Silva' } })).id;
  mariaId = (await prisma.motorista.findFirstOrThrow({ where: { nome: 'Maria Souza' } })).id;
});

const paradasPadrao = () =>
  pontos.map((p, i) => ({ pontoId: p.id, ordem: i + 1, codigoPedido: i ? `PED-${i}` : null }));

async function criarRoteiro(motoristaId: string, data: string) {
  const res = await request(app)
    .post('/api/roteiros')
    .set(await auth(GERENTE))
    .send({ data, motoristaId, paradas: paradasPadrao() });
  expect(res.status).toBe(201);
  return res.body;
}

describe('montagem (UC06)', () => {
  it('cria roteiro PLANEJADO com veículo padrão do motorista', async () => {
    const r = await criarRoteiro(mariaId, somarDias(hoje, 3));
    expect(r.status).toBe('PLANEJADO');
    expect(r.veiculo.tipo).toBe('MOTO');
    expect(r.paradas).toHaveLength(4);
    expect(r.paradas[1].codigoPedido).toBe('PED-1');
  });

  it('V1: menos de 2 pontos → 422 ROTEIRO_MIN_PONTOS', async () => {
    const res = await request(app)
      .post('/api/roteiros')
      .set(await auth(GERENTE))
      .send({
        data: somarDias(hoje, 4),
        motoristaId: mariaId,
        paradas: [{ pontoId: pontos[0].id, ordem: 1 }],
      });
    expect(res.status).toBe(422);
    expect(res.body.erro.codigo).toBe('ROTEIRO_MIN_PONTOS');
  });

  it('V2: ordens não contíguas → 422 ORDEM_INVALIDA', async () => {
    const res = await request(app)
      .post('/api/roteiros')
      .set(await auth(GERENTE))
      .send({
        data: somarDias(hoje, 4),
        motoristaId: mariaId,
        paradas: [
          { pontoId: pontos[0].id, ordem: 1 },
          { pontoId: pontos[1].id, ordem: 3 },
        ],
      });
    expect(res.body.erro.codigo).toBe('ORDEM_INVALIDA');
  });

  it('RN05: segundo roteiro para o mesmo motorista e data → 409; após cancelar, pode criar', async () => {
    const data = somarDias(hoje, 5);
    const primeiro = await criarRoteiro(mariaId, data);
    const res = await request(app)
      .post('/api/roteiros')
      .set(await auth(GERENTE))
      .send({ data, motoristaId: mariaId, paradas: paradasPadrao() });
    expect(res.status).toBe(409);
    expect(res.body.erro.codigo).toBe('ROTEIRO_DUPLICADO');

    const cancelado = await request(app)
      .post(`/api/roteiros/${primeiro.id}/cancelar`)
      .set(await auth(GERENTE));
    expect(cancelado.body.status).toBe('CANCELADO');
    await criarRoteiro(mariaId, data);
  });

  it('PUT reordena pontos de roteiro planejado', async () => {
    const r = await criarRoteiro(mariaId, somarDias(hoje, 6));
    const invertido = [...pontos].reverse().map((p, i) => ({ pontoId: p.id, ordem: i + 1 }));
    const res = await request(app)
      .put(`/api/roteiros/${r.id}`)
      .set(await auth(GERENTE))
      .send({ data: r.data, motoristaId: mariaId, paradas: invertido });
    expect(res.status).toBe(200);
    expect(res.body.paradas[0].ponto.id).toBe(pontos[3].id);
  });
});

describe('coleta (UC07) e finalização (UC09)', () => {
  let roteiro: { id: string; paradas: { id: string; ordem: number }[] };
  const parada = (ordem: number) => roteiro.paradas.find((p) => p.ordem === ordem)!.id;
  const registrar = async (ordem: number, tipo: 'chegada' | 'saida', dataHora?: string) =>
    request(app)
      .post(`/api/roteiros/${roteiro.id}/paradas/${parada(ordem)}/${tipo}`)
      .set(await auth(JOAO))
      .send(dataHora ? { dataHora, latitude: -19.93, longitude: -43.94 } : {});

  beforeAll(async () => {
    roteiro = await criarRoteiro(joaoId, hoje);
  });

  it('motorista vê o roteiro de hoje em /roteiros/meus', async () => {
    const res = await request(app)
      .get('/api/roteiros/meus')
      .set(await auth(JOAO));
    expect(res.status).toBe(200);
    expect(res.body.roteiro.id).toBe(roteiro.id);
  });

  it('V4: chegada na partida → 422', async () => {
    const res = await registrar(1, 'chegada');
    expect(res.body.erro.codigo).toBe('PARTIDA_SEM_CHEGADA');
  });

  it('V5: chegada no ponto 2 antes da saída da partida → 422', async () => {
    const res = await registrar(2, 'chegada', minutosAtras(100));
    expect(res.status).toBe(422);
    expect(res.body.erro.codigo).toBe('SEQUENCIA_INVALIDA');
  });

  it('partida: registra saída, tempo parado nulo e total inalterado (RN01)', async () => {
    const res = await registrar(1, 'saida', minutosAtras(120));
    expect(res.status).toBe(200);
    expect(res.body.tempoParadoMin).toBeNull();
    expect(res.body.tempoTotalParadoMin).toBe(0);
    expect(res.body.statusRoteiro).toBe('EM_ANDAMENTO');
  });

  it('V6: chegada anterior à saída do ponto anterior → 422', async () => {
    const res = await registrar(2, 'chegada', minutosAtras(130));
    expect(res.body.erro.codigo).toBe('HORARIO_INCONSISTENTE');
  });

  it('V7: horário no futuro → 422', async () => {
    const res = await registrar(2, 'chegada', new Date(Date.now() + 10 * 60000).toISOString());
    expect(res.body.erro.codigo).toBe('HORARIO_FUTURO');
  });

  it('chegada e saída calculam o tempo parado e o total', async () => {
    await registrar(2, 'chegada', minutosAtras(100));
    const saida = await registrar(2, 'saida', minutosAtras(85));
    expect(saida.body.tempoParadoMin).toBe(15);
    expect(saida.body.tempoTotalParadoMin).toBe(15);
  });

  it('não sobrescreve horário já registrado', async () => {
    const res = await registrar(2, 'saida', minutosAtras(80));
    expect(res.body.erro.codigo).toBe('SEQUENCIA_INVALIDA');
  });

  it('V10: finalizar com paradas pendentes → 422', async () => {
    const res = await request(app)
      .post(`/api/roteiros/${roteiro.id}/finalizar`)
      .set(await auth(JOAO))
      .send({});
    expect(res.body.erro.codigo).toBe('PONTOS_PENDENTES');
    expect(res.body.erro.detalhes.ordens).toEqual([3, 4]);
  });

  it('V9: roteiro em andamento não aceita edição dos pontos', async () => {
    const res = await request(app)
      .put(`/api/roteiros/${roteiro.id}`)
      .set(await auth(GERENTE))
      .send({ data: hoje, motoristaId: joaoId, paradas: paradasPadrao() });
    expect(res.body.erro.codigo).toBe('ROTEIRO_EM_ANDAMENTO');
  });

  it('finaliza: distância, custo e % da jornada com snapshot de parâmetros', async () => {
    await registrar(3, 'chegada', minutosAtras(60));
    await registrar(3, 'saida', minutosAtras(50));
    await registrar(4, 'chegada', minutosAtras(20));
    await registrar(4, 'saida', minutosAtras(10));
    const res = await request(app)
      .post(`/api/roteiros/${roteiro.id}/finalizar`)
      .set(await auth(JOAO))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'FINALIZADO',
      tempoTotalParadoMin: 35,
      distanciaTotalKm: 10.72,
      custoPorKm: 0.7,
      custoEstimado: 7.5,
      percentualJornada: 7.29,
    });
    expect(res.body.parametroId).toBeTruthy();
  });

  it('V8: roteiro finalizado não aceita registro do motorista', async () => {
    const res = await registrar(4, 'saida', minutosAtras(5));
    expect(res.body.erro.codigo).toBe('ROTEIRO_FECHADO');
  });

  it('RNF05: correção de horário pelo gerente recalcula e gera log com valor anterior e novo', async () => {
    const res = await request(app)
      .patch(`/api/roteiros/${roteiro.id}/paradas/${parada(4)}`)
      .set(await auth(GERENTE))
      .send({ saidaEm: minutosAtras(0) });
    expect(res.status).toBe(200);
    const p4 = res.body.paradas.find((p: { ordem: number }) => p.ordem === 4);
    expect(p4.tempoParadoMin).toBe(20);
    expect(res.body.tempoTotalParadoMin).toBe(45);
    expect(res.body.custoEstimado).toBe(7.5);

    const log = await prisma.logAuditoria.findFirst({
      where: { entidade: 'PontoRoteiro', entidadeId: parada(4) },
      orderBy: { dataHora: 'desc' },
    });
    expect(log?.valorAnterior).toMatchObject({ tempoParadoMin: 10 });
    expect(log?.valorNovo).toMatchObject({ tempoParadoMin: 20, origem: 'correção de horário' });
  });

  it('finalizar com km informado usa o odômetro (RN07)', async () => {
    const r = await criarRoteiro(joaoId, somarDias(hoje, -95));
    const correcoes = [
      [1, { saidaEm: minutosAtras(200) }],
      [2, { chegadaEm: minutosAtras(190), saidaEm: minutosAtras(180) }],
      [3, { chegadaEm: minutosAtras(170), saidaEm: minutosAtras(160) }],
      [4, { chegadaEm: minutosAtras(150), saidaEm: minutosAtras(140) }],
    ] as const;
    for (const [ordem, horarios] of correcoes) {
      const id = r.paradas.find((p: { ordem: number }) => p.ordem === ordem).id;
      const res = await request(app)
        .patch(`/api/roteiros/${r.id}/paradas/${id}`)
        .set(await auth(ADMIN))
        .send(horarios);
      expect(res.status).toBe(200);
    }
    const fim = await request(app)
      .post(`/api/roteiros/${r.id}/finalizar`)
      .set(await auth(GERENTE))
      .send({ kmInformado: 12.5 });
    expect(fim.body.distanciaTotalKm).toBe(12.5);
    expect(fim.body.custoEstimado).toBe(8.75);
  });
});

describe('escopo', () => {
  it('motorista não vê roteiro de outro motorista (404) nem lista geral (403)', async () => {
    const daMaria = await prisma.roteiro.findFirstOrThrow({ where: { motoristaId: mariaId } });
    expect(
      (
        await request(app)
          .get(`/api/roteiros/${daMaria.id}`)
          .set(await auth(JOAO))
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .get('/api/roteiros')
          .set(await auth(JOAO))
      ).status,
    ).toBe(403);
  });

  it('lista por data e status', async () => {
    const res = await request(app)
      .get(`/api/roteiros?data=${somarDias(hoje, -1)}&status=FINALIZADO`)
      .set(await auth(GERENTE));
    expect(res.body.total).toBe(3);
    expect(
      res.body.itens.map((r: { tempoTotalParadoMin: number }) => r.tempoTotalParadoMin).sort(),
    ).toEqual([41, 45, 75]);
  });
});
