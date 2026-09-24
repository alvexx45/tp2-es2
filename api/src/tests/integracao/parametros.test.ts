import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../db/prisma.ts';
import { hojeLocal, somarDias } from '../../lib/datas.ts';
import { ADMIN, app, auth, GERENTE, JOAO } from './helpers.ts';

describe('parâmetros (RF09, RF10)', () => {
  // Volta ao preço do seed para não afetar os outros arquivos de teste (a ordem entre arquivos não é fixa).
  afterAll(async () => {
    await request(app)
      .post('/api/parametros/custos')
      .set(await auth(ADMIN))
      .send({ valorCombustivelLitro: 6 });
  });

  it('vigente é acessível a todos os perfis', async () => {
    const res = await request(app)
      .get('/api/parametros/vigente')
      .set(await auth(JOAO));
    expect(res.status).toBe(200);
    expect(res.body.jornadaPadraoHoras).toBe(8);
  });

  it('gerente não altera jornada (403); valida faixas (422)', async () => {
    expect(
      (
        await request(app)
          .post('/api/parametros/jornada')
          .set(await auth(GERENTE))
          .send({ jornadaPadraoHoras: 6 })
      ).status,
    ).toBe(403);
    const fora = await request(app)
      .post('/api/parametros/custos')
      .set(await auth(GERENTE))
      .send({ fatorCorrecaoRota: 3.5 });
    expect(fora.status).toBe(422);
    const jornada = await request(app)
      .post('/api/parametros/jornada')
      .set(await auth(ADMIN))
      .send({ jornadaPadraoHoras: 25 });
    expect(jornada.status).toBe(422);
  });

  it('nova versão copia os campos não enviados e o roteiro antigo mantém o custo anterior', async () => {
    const antigo = await prisma.roteiro.findFirstOrThrow({
      where: {
        motorista: { nome: 'João Silva' },
        data: new Date(`${somarDias(hojeLocal(), -1)}T00:00:00Z`),
      },
    });
    expect(Number(antigo.custoEstimado)).toBe(7.5);

    const res = await request(app)
      .post('/api/parametros/custos')
      .set(await auth(GERENTE))
      .send({ valorCombustivelLitro: 7.2 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      valorCombustivelLitro: 7.2,
      kmPorLitroPadrao: 12,
      custoOperacionalPorKm: 0.2,
    });

    // Novo roteiro finalizado usa o novo preço: 7,20 / 12 + 0,20 = 0,80/km × 10,72 km = R$ 8,58.
    const maria = await prisma.motorista.findFirstOrThrow({ where: { nome: 'Carlos Lima' } });
    const pontos = await prisma.ponto.findMany({
      where: { descricao: { in: ['P1', 'P2', 'P3', 'P4'] } },
      orderBy: { descricao: 'asc' },
    });
    const carro = await prisma.veiculo.findFirstOrThrow({ where: { tipo: 'CARRO' } });
    const criado = await request(app)
      .post('/api/roteiros')
      .set(await auth(GERENTE))
      .send({
        data: somarDias(hojeLocal(), -200),
        motoristaId: maria.id,
        veiculoId: carro.id,
        paradas: pontos.map((p, i) => ({ pontoId: p.id, ordem: i + 1 })),
      });
    const base = Date.now() - 6 * 3600000;
    const t = (min: number) => new Date(base + min * 60000).toISOString();
    const horarios = [
      { saidaEm: t(0) },
      { chegadaEm: t(10), saidaEm: t(20) },
      { chegadaEm: t(30), saidaEm: t(40) },
      { chegadaEm: t(50), saidaEm: t(60) },
    ];
    for (const [i, h] of horarios.entries()) {
      await request(app)
        .patch(`/api/roteiros/${criado.body.id}/paradas/${criado.body.paradas[i].id}`)
        .set(await auth(GERENTE))
        .send(h);
    }
    const fim = await request(app)
      .post(`/api/roteiros/${criado.body.id}/finalizar`)
      .set(await auth(GERENTE))
      .send({});
    expect(fim.body.custoPorKm).toBe(0.8);
    expect(fim.body.custoEstimado).toBe(8.58);
    expect(fim.body.parametroId).toBe(res.body.id);

    const depois = await request(app)
      .get(`/api/roteiros/${antigo.id}`)
      .set(await auth(GERENTE));
    expect(depois.body.custoEstimado).toBe(7.5);
    expect(depois.body.custoPorKm).toBe(0.7);
  });

  it('histórico de versões e auditoria da alteração', async () => {
    const res = await request(app)
      .get('/api/parametros')
      .set(await auth(GERENTE));
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    const log = await prisma.logAuditoria.findFirst({
      where: { entidade: 'ParametroSistema', entidadeId: res.body.itens[0].id },
    });
    expect(log?.valorAnterior).toMatchObject({ valorCombustivelLitro: 6 });
  });
});
