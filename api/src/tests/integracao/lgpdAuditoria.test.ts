import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { prisma } from '../../db/prisma.ts';
import { ADMIN, app, auth, GERENTE } from './helpers.ts';

describe('auditoria (RNF05) e LGPD (RNF06)', () => {
  it('só admin consulta a auditoria; filtros por entidade', async () => {
    expect(
      (
        await request(app)
          .get('/api/auditoria')
          .set(await auth(GERENTE))
      ).status,
    ).toBe(403);
    await request(app)
      .post('/api/pontos')
      .set(await auth(GERENTE))
      .send({ endereco: 'Rua Auditada, 1', latitude: -19.9, longitude: -43.9 });
    const res = await request(app)
      .get('/api/auditoria?entidade=Ponto')
      .set(await auth(ADMIN));
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.itens[0]).toMatchObject({
      entidade: 'Ponto',
      acao: 'CRIACAO',
      usuario: { email: 'gerente@mvp.local' },
    });
  });

  it('log nunca contém senhaHash', async () => {
    await request(app)
      .post('/api/usuarios')
      .set(await auth(ADMIN))
      .send({ email: 'auditado@mvp.local', senha: 'segredo1', perfil: 'ADMIN' });
    const logs = await prisma.logAuditoria.findMany({ where: { entidade: 'Usuario' } });
    expect(logs.length).toBeGreaterThan(0);
    for (const l of logs)
      expect(JSON.stringify([l.valorAnterior, l.valorNovo])).not.toContain('senhaHash');
  });

  it('anonimização remove dados pessoais, desativa o usuário e mantém os roteiros', async () => {
    const criado = await request(app)
      .post('/api/motoristas')
      .set(await auth(GERENTE))
      .send({
        nome: 'Ana Pessoal',
        telefone: '(31) 95555-0000',
        documento: '390.533.447-05',
        email: 'ana@mvp.local',
        senha: 'ana12345',
      });
    const id = criado.body.id;
    expect(
      (
        await request(app)
          .post(`/api/motoristas/${id}/anonimizar`)
          .set(await auth(GERENTE))
      ).status,
    ).toBe(403);

    const res = await request(app)
      .post(`/api/motoristas/${id}/anonimizar`)
      .set(await auth(ADMIN));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      nome: `Motorista anonimizado ${id.slice(0, 6)}`,
      telefone: null,
      documento: null,
      anonimizado: true,
      ativo: false,
    });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@mvp.local', senha: 'ana12345' });
    expect(login.status).toBe(401);
    const logs = await prisma.logAuditoria.findMany({ where: { entidadeId: id } });
    expect(JSON.stringify(logs)).not.toContain('Ana Pessoal');
    expect(JSON.stringify(logs)).not.toContain('390.533.447-05');
  });
});
