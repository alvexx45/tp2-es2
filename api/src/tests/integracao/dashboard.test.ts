import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { hojeLocal, somarDias } from '../../lib/datas.ts';
import { ADMIN, app, auth, GERENTE, JOAO } from './helpers.ts';

const hoje = hojeLocal();
const ontem = somarDias(hoje, -1);

describe('dashboard (RF08)', () => {
  it('RNF04: motorista recebe 403', async () => {
    expect(
      (
        await request(app)
          .get(`/api/dashboard/dia?data=${ontem}`)
          .set(await auth(JOAO))
      ).status,
    ).toBe(403);
  });

  it('dia: cards e paradas com endereço e data/hora (roteiros A, B e C)', async () => {
    const res = await request(app)
      .get(`/api/dashboard/dia?data=${ontem}`)
      .set(await auth(GERENTE));
    expect(res.status).toBe(200);
    expect(res.body.cards).toMatchObject({
      tempoTotalParadoMin: 161,
      paradas: 9,
      roteiros: 3,
      distanciaKm: 32.16,
    });
    // (75 + 41 + 45) / (3 × 480) × 100
    expect(res.body.cards.percentualJornada).toBe(11.18);
    expect(res.body.cards.custoEstimado).toBe(20.77);
    expect(res.body.paradas).toHaveLength(9);
    for (const p of res.body.paradas) {
      expect(p.endereco).toBeTruthy();
      expect(p.chegadaEm).toBeTruthy();
      expect(p.saidaEm).toBeTruthy();
    }
  });

  it('dia com filtro de motorista', async () => {
    const lista = await request(app)
      .get('/api/motoristas?busca=João')
      .set(await auth(GERENTE));
    const res = await request(app)
      .get(`/api/dashboard/dia?data=${ontem}&motoristaId=${lista.body.itens[0].id}`)
      .set(await auth(GERENTE));
    expect(res.body.cards.tempoTotalParadoMin).toBe(75);
    expect(res.body.cards.percentualJornada).toBe(15.63);
  });

  it('mês: série por dia do mês, não vazia', async () => {
    const [ano, mes] = somarDias(hoje, -5).split('-').map(Number);
    const res = await request(app)
      .get(`/api/dashboard/mes?ano=${ano}&mes=${mes}`)
      .set(await auth(ADMIN));
    expect(res.status).toBe(200);
    expect(res.body.serie.length).toBeGreaterThanOrEqual(28);
    const comDados = res.body.serie.filter((d: { tempoParadoMin: number }) => d.tempoParadoMin > 0);
    expect(comDados.length).toBeGreaterThan(0);
    expect(comDados[0].maiorParada.endereco).toBeTruthy();
    expect(res.body.cards.tempoTotalParadoMin).toBe(
      res.body.serie.reduce((s: number, d: { tempoParadoMin: number }) => s + d.tempoParadoMin, 0),
    );
  });

  it('período: por dia até 62 dias; por mês acima; ranking top 10', async () => {
    const curto = await request(app)
      .get(`/api/dashboard/periodo?inicio=${somarDias(hoje, -30)}&fim=${hoje}`)
      .set(await auth(GERENTE));
    expect(curto.body.agrupamento).toBe('dia');
    expect(curto.body.serie).toHaveLength(31);
    const longo = await request(app)
      .get(`/api/dashboard/periodo?inicio=${somarDias(hoje, -90)}&fim=${hoje}`)
      .set(await auth(GERENTE));
    expect(longo.body.agrupamento).toBe('mes');
    expect(longo.body.ranking.length).toBeGreaterThan(0);
    expect(longo.body.ranking.length).toBeLessThanOrEqual(10);
    expect(longo.body.ranking[0].tempoMedioMin).toBeGreaterThanOrEqual(
      longo.body.ranking.at(-1).tempoMedioMin,
    );
  });

  it('período acima de 366 dias → 422', async () => {
    const res = await request(app)
      .get(`/api/dashboard/periodo?inicio=${somarDias(hoje, -400)}&fim=${hoje}`)
      .set(await auth(GERENTE));
    expect(res.status).toBe(422);
    expect(res.body.erro.codigo).toBe('PERIODO_INVALIDO');
  });
});
