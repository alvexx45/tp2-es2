import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../db/prisma.ts';
import { ADMIN, app, auth, GERENTE, JOAO, token } from './helpers.ts';

describe('cadastros', () => {
  let outroGerente: { email: string; id: string };

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/gerentes')
      .set(await auth(ADMIN))
      .send({
        nome: 'Coordenadora Norte',
        telefone: '(31) 97777-0000',
        email: 'norte@mvp.local',
        cargo: 'COORDENADOR',
        senha: 'norte123',
      });
    expect(res.status).toBe(201);
    outroGerente = { email: 'norte@mvp.local', id: res.body.id };
  });

  it('gerente cria motorista na própria equipe e o motorista consegue entrar', async () => {
    const veiculos = await request(app)
      .get('/api/veiculos')
      .set(await auth(GERENTE));
    const res = await request(app)
      .post('/api/motoristas')
      .set(await auth(GERENTE))
      .send({
        nome: 'Pedro Alves',
        telefone: '(31) 96666-0000',
        documento: '529.982.247-25',
        veiculoId: veiculos.body.itens[0].id,
        email: 'Pedro@MVP.local',
        senha: 'pedro123',
      });
    expect(res.status).toBe(201);
    expect(res.body.gerente.nome).toBe('Gerente Exemplo');
    expect(res.body.email).toBe('pedro@mvp.local');

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pedro@mvp.local', senha: 'pedro123' });
    expect(login.status).toBe(200);
    expect(login.body.usuario.perfil).toBe('MOTORISTA');

    const log = await prisma.logAuditoria.findFirst({
      where: { entidade: 'Motorista', entidadeId: res.body.id },
    });
    expect(log?.acao).toBe('CRIACAO');
    expect(JSON.stringify(log?.valorNovo)).not.toContain('529.982.247-25');
  });

  it('documento mascarado na lista e completo no detalhe', async () => {
    const lista = await request(app)
      .get('/api/motoristas?busca=João')
      .set(await auth(GERENTE));
    expect(lista.body.itens[0].documento).toBe('***.456.789-**');
    const detalhe = await request(app)
      .get(`/api/motoristas/${lista.body.itens[0].id}`)
      .set(await auth(GERENTE));
    expect(detalhe.body.documento).toBe('123.456.789-09');
  });

  it('RNF04: gerente de outra equipe recebe 404; motorista recebe 403 nos cadastros', async () => {
    const joao = await prisma.motorista.findFirstOrThrow({ where: { nome: 'João Silva' } });
    const tokenNorte = await token(outroGerente.email, 'norte123');
    const res = await request(app)
      .get(`/api/motoristas/${joao.id}`)
      .set({ Authorization: `Bearer ${tokenNorte}` });
    expect(res.status).toBe(404);
    const lista = await request(app)
      .get('/api/motoristas')
      .set({ Authorization: `Bearer ${tokenNorte}` });
    expect(lista.body.total).toBe(0);
    expect(
      (
        await request(app)
          .get('/api/motoristas')
          .set(await auth(JOAO))
      ).status,
    ).toBe(403);
  });

  it('admin precisa informar o gerente ao criar motorista', async () => {
    const res = await request(app)
      .post('/api/motoristas')
      .set(await auth(ADMIN))
      .send({ nome: 'Sem Gerente', email: 'semgerente@mvp.local', senha: '123456' });
    expect(res.status).toBe(422);
    expect(res.body.erro.codigo).toBe('GERENTE_OBRIGATORIO');
  });

  it('pontos: cria, busca por endereço e inativa (sem apagar)', async () => {
    const criado = await request(app)
      .post('/api/pontos')
      .set(await auth(GERENTE))
      .send({
        descricao: 'Cliente Teste',
        endereco: 'Rua dos Testes, 123',
        latitude: -19.9,
        longitude: -43.9,
      });
    expect(criado.status).toBe(201);
    const busca = await request(app)
      .get('/api/pontos?busca=testes')
      .set(await auth(GERENTE));
    expect(busca.body.itens.map((p: { id: string }) => p.id)).toContain(criado.body.id);
    const inativado = await request(app)
      .delete(`/api/pontos/${criado.body.id}`)
      .set(await auth(GERENTE));
    expect(inativado.body.ativo).toBe(false);
    expect(await prisma.ponto.findUnique({ where: { id: criado.body.id } })).not.toBeNull();
  });

  it('valida dados: latitude fora do intervalo e km/L ≤ 0 → 422', async () => {
    const ponto = await request(app)
      .post('/api/pontos')
      .set(await auth(GERENTE))
      .send({ endereco: 'Rua Y', latitude: -91, longitude: 0 });
    expect(ponto.status).toBe(422);
    const veiculo = await request(app)
      .post('/api/veiculos')
      .set(await auth(GERENTE))
      .send({ placa: 'ABC1D23', modelo: 'X', tipo: 'CARRO', kmPorLitro: 0 });
    expect(veiculo.status).toBe(422);
  });

  it('placa duplicada → 409', async () => {
    const res = await request(app)
      .post('/api/veiculos')
      .set(await auth(ADMIN))
      .send({ placa: 'car-2b34', modelo: 'Outro', tipo: 'CARRO', kmPorLitro: 10 });
    expect(res.status).toBe(409);
  });

  it('usuários: admin lista, não pode rebaixar a si mesmo e só cria ADMIN', async () => {
    const lista = await request(app)
      .get('/api/usuarios?perfil=ADMIN')
      .set(await auth(ADMIN));
    const admin = lista.body.itens[0];
    const rebaixar = await request(app)
      .patch(`/api/usuarios/${admin.id}`)
      .set(await auth(ADMIN))
      .send({ perfil: 'GERENTE' });
    expect(rebaixar.status).toBe(422);
    const criar = await request(app)
      .post('/api/usuarios')
      .set(await auth(ADMIN))
      .send({ email: 'x@mvp.local', senha: '123456', perfil: 'MOTORISTA' });
    expect(criar.body.erro.codigo).toBe('PERFIL_INCOMPATIVEL');
    expect(
      (
        await request(app)
          .get('/api/usuarios')
          .set(await auth(GERENTE))
      ).status,
    ).toBe(403);
  });

  it('id inválido na rota → 404', async () => {
    expect(
      (
        await request(app)
          .get('/api/pontos/nao-e-uuid')
          .set(await auth(GERENTE))
      ).status,
    ).toBe(404);
  });
});
