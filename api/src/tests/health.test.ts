import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { criarApp } from '../app.ts';

describe('GET /api/health', () => {
  it('responde ok', async () => {
    const res = await request(criarApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
