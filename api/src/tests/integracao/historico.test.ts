import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { hojeLocal, somarDias } from '../../lib/datas.ts';
import { app, auth, GERENTE, JOAO } from './helpers.ts';

const ontem = somarDias(hojeLocal(), -1);

describe('histórico (RF07) e CSV (RF12)', () => {
  it('todo item tem endereço e data/hora; partida não aparece por padrão', async () => {
    const res = await request(app)
      .get(`/api/historico?inicio=${ontem}&fim=${ontem}&tamanho=50`)
      .set(await auth(GERENTE));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(9);
    for (const item of res.body.itens) {
      expect(item.endereco).toBeTruthy();
      expect(item.chegadaEm).toBeTruthy();
      expect(item.saidaEm).toBeTruthy();
      expect(item.ordem).toBeGreaterThan(1);
    }
    const joao = res.body.itens.filter((i: { motorista: string }) => i.motorista === 'João Silva');
    expect(joao.map((i: { tempoParadoMin: number }) => i.tempoParadoMin)).toEqual([15, 10, 50]);
  });

  it('incluirPartida=true traz a ordem 1 com tempoParadoMin null', async () => {
    const res = await request(app)
      .get(`/api/historico?inicio=${ontem}&fim=${ontem}&incluirPartida=true&tamanho=50`)
      .set(await auth(GERENTE));
    const partidas = res.body.itens.filter((i: { ordem: number }) => i.ordem === 1);
    expect(partidas).toHaveLength(3);
    expect(partidas.every((p: { tempoParadoMin: null }) => p.tempoParadoMin === null)).toBe(true);
  });

  it('busca por endereço', async () => {
    const res = await request(app)
      .get(`/api/historico?inicio=${ontem}&fim=${ontem}&busca=peru`)
      .set(await auth(GERENTE));
    expect(res.body.total).toBe(3);
  });

  it('motorista só vê os próprios registros e não exporta CSV', async () => {
    const res = await request(app)
      .get(`/api/historico?inicio=${ontem}&fim=${ontem}`)
      .set(await auth(JOAO));
    expect(res.body.total).toBe(3);
    expect(
      (
        await request(app)
          .get('/api/historico/exportar.csv')
          .set(await auth(JOAO))
      ).status,
    ).toBe(403);
  });

  it('CSV com BOM, separador ; e cabeçalho da especificação', async () => {
    const res = await request(app)
      .get(`/api/historico/exportar.csv?inicio=${ontem}&fim=${ontem}`)
      .set(await auth(GERENTE));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    const linhas = res.text.slice(1).trim().split('\r\n');
    expect(linhas[0]).toBe(
      'data;motorista;ordem;endereco;codigo_pedido;chegada;saida;tempo_parado_min',
    );
    expect(linhas).toHaveLength(10);
    const [a, m, d] = ontem.split('-');
    expect(
      linhas.some(
        (l) => l.startsWith(`${d}/${m}/${a};João Silva;2;Rua Peru, 55;`) && l.endsWith(';15'),
      ),
    ).toBe(true);
  });
});
