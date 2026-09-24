import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ADMIN, app, auth, GERENTE, JOAO } from './helpers.ts';

describe('autenticação', () => {
  it('login devolve token e dados do usuário', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: JOAO, senha: 'motorista123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf('string');
    expect(res.body.usuario).toMatchObject({
      email: JOAO,
      perfil: 'MOTORISTA',
      nome: 'João Silva',
    });
  });

  it('senha errada → 401 com formato de erro padrão', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ADMIN, senha: 'errada' });
    expect(res.status).toBe(401);
    expect(res.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  it('GET /auth/me sem token → 401; com token → usuário', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const res = await request(app)
      .get('/api/auth/me')
      .set(await auth(GERENTE));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ perfil: 'GERENTE', nome: 'Gerente Exemplo' });
  });

  it('body inválido → 422 DADOS_INVALIDOS', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: '' });
    expect(res.status).toBe(422);
    expect(res.body.erro.codigo).toBe('DADOS_INVALIDOS');
  });
});
