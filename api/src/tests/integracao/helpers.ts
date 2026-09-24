import request from 'supertest';
import { criarApp } from '../../app.ts';

export const app = criarApp();

const cache = new Map<string, string>();

/** Faz login com um usuário do seed e devolve o token (com cache por e-mail). */
export async function token(email: string, senha?: string): Promise<string> {
  const chave = `${email}:${senha ?? ''}`;
  if (cache.has(chave)) return cache.get(chave)!;
  const padrao = email.startsWith('admin')
    ? 'admin123'
    : email.startsWith('gerente')
      ? 'gerente123'
      : 'motorista123';
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, senha: senha ?? padrao });
  if (res.status !== 200)
    throw new Error(`login falhou para ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  cache.set(chave, res.body.token);
  return res.body.token;
}

export const auth = async (email: string) => ({ Authorization: `Bearer ${await token(email)}` });

export const ADMIN = 'admin@mvp.local';
export const GERENTE = 'gerente@mvp.local';
export const JOAO = 'joao@mvp.local';
