import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../db/prisma.ts';
import { hojeLocal, somarDias } from '../../lib/datas.ts';
import { executarSeedCarga } from '../../seed/carga.ts';
import { app, auth, GERENTE } from '../integracao/helpers.ts';

/**
 * RNF03: com a massa do `seed:carga` (~40 mil paradas em 12 meses), o dashboard de período de 12 meses
 * responde em menos de 3 s. Rodar com `npm run test:carga` (fica fora do `npm test` por ser demorado).
 */
describe.skipIf(!process.env.TESTE_CARGA)('desempenho (RNF03)', () => {
  beforeAll(async () => {
    await executarSeedCarga(prisma);
  }, 300_000);

  it('massa de carga tem ~40 mil paradas', async () => {
    const paradas = await prisma.pontoRoteiro.count({ where: { ordem: { gt: 1 } } });
    expect(paradas).toBeGreaterThanOrEqual(40_000);
  });

  it('/dashboard/periodo de 12 meses responde em < 3 s', async () => {
    const hoje = hojeLocal();
    const cabecalho = await auth(GERENTE);
    const url = `/api/dashboard/periodo?inicio=${somarDias(hoje, -364)}&fim=${hoje}`;
    await request(app).get(url).set(cabecalho); // aquece conexões e cache de planos

    const inicio = performance.now();
    const res = await request(app).get(url).set(cabecalho);
    const ms = performance.now() - inicio;
    console.log(
      `/dashboard/periodo (12 meses): ${ms.toFixed(0)} ms, ${res.body.cards.paradas} paradas`,
    );
    expect(res.status).toBe(200);
    expect(res.body.cards.paradas).toBeGreaterThanOrEqual(40_000);
    expect(ms).toBeLessThan(3000);
  });

  it('dia e mês também < 3 s', async () => {
    const cabecalho = await auth(GERENTE);
    const [ano, mes] = hojeLocal().split('-').map(Number);
    for (const url of [
      `/api/dashboard/dia?data=${somarDias(hojeLocal(), -1)}`,
      `/api/dashboard/mes?ano=${ano}&mes=${mes}`,
    ]) {
      const inicio = performance.now();
      const res = await request(app).get(url).set(cabecalho);
      expect(res.status).toBe(200);
      expect(performance.now() - inicio).toBeLessThan(3000);
    }
  });
});
