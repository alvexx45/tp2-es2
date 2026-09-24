import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { diaDaSemana, hojeLocal, somarDias } from '../lib/datas.ts';
import {
  criarAleatorio,
  montarRoteiroAleatorio,
  montarRoteiroFinalizado,
  type ParametroSeed,
  type PontoSeed,
  type RoteiroGerado,
} from './gerador.ts';

export const ADMIN_EMAIL = 'admin@mvp.local';

const PONTOS_EXEMPLO = [
  {
    descricao: 'P1',
    endereco: 'Base Sagrada Família (partida)',
    latitude: -19.9165,
    longitude: -43.9245,
  },
  { descricao: 'P2', endereco: 'Rua Peru, 55', latitude: -19.9362, longitude: -43.946 },
  { descricao: 'P3', endereco: 'Rua X, 5', latitude: -19.9551, longitude: -43.9583 },
  { descricao: 'P4', endereco: 'Av. João César', latitude: -19.9724, longitude: -43.9409 },
];

// Endereços fictícios adicionais (região de Belo Horizonte) para o histórico aleatório.
const PONTOS_EXTRAS = [
  {
    descricao: 'Cliente Savassi',
    endereco: 'Rua Pernambuco, 1000',
    latitude: -19.9372,
    longitude: -43.9338,
  },
  {
    descricao: 'Cliente Centro',
    endereco: 'Av. Afonso Pena, 1500',
    latitude: -19.9245,
    longitude: -43.9352,
  },
  {
    descricao: 'Cliente Funcionários',
    endereco: 'Rua Gonçalves Dias, 300',
    latitude: -19.9331,
    longitude: -43.9304,
  },
  {
    descricao: 'Cliente Floresta',
    endereco: 'Rua Pouso Alegre, 820',
    latitude: -19.9171,
    longitude: -43.9294,
  },
  {
    descricao: 'Cliente Santa Efigênia',
    endereco: 'Av. Brasil, 400',
    latitude: -19.9268,
    longitude: -43.9223,
  },
  {
    descricao: 'Cliente Lourdes',
    endereco: 'Rua Curitiba, 2100',
    latitude: -19.9303,
    longitude: -43.9471,
  },
  {
    descricao: 'Cliente Prado',
    endereco: 'Rua Platina, 150',
    latitude: -19.9265,
    longitude: -43.9613,
  },
  {
    descricao: 'Cliente Pampulha',
    endereco: 'Av. Otacílio Negrão de Lima, 3000',
    latitude: -19.8517,
    longitude: -43.9764,
  },
  {
    descricao: 'Cliente Barreiro',
    endereco: 'Av. Afonso Vaz de Melo, 640',
    latitude: -19.9767,
    longitude: -44.0189,
  },
  {
    descricao: 'Cliente Cidade Nova',
    endereco: 'Av. Cristiano Machado, 1900',
    latitude: -19.8906,
    longitude: -43.9254,
  },
];

/**
 * Seed da Seção 12. Idempotente: se o admin já existe, não faz nada.
 * @returns `true` se os dados foram criados.
 */
export async function executarSeed(prisma: PrismaClient, hoje = hojeLocal()): Promise<boolean> {
  if (await prisma.usuario.findUnique({ where: { email: ADMIN_EMAIL } })) return false;

  const [hashAdmin, hashGerente, hashMotorista] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('gerente123', 10),
    bcrypt.hash('motorista123', 10),
  ]);

  const parametroValores = {
    valorCombustivelLitro: 6,
    kmPorLitroPadrao: 12,
    custoOperacionalPorKm: 0.2,
    fatorCorrecaoRota: 1.3,
    jornadaPadraoHoras: 8,
    tempoMinimoParadaMin: 0,
    limiteAlertaParadaMin: 60,
  };

  await prisma.$transaction(
    async (tx) => {
      const admin = await tx.usuario.create({
        data: { email: ADMIN_EMAIL, senhaHash: hashAdmin, perfil: 'ADMIN' },
      });

      // A primeira versão vale desde antes do histórico gerado.
      const parametro = await tx.parametroSistema.create({
        data: {
          ...parametroValores,
          vigenteDesde: new Date(`${somarDias(hoje, -120)}T00:00:00-03:00`),
          criadoPorId: admin.id,
        },
      });
      const param: ParametroSeed = { id: parametro.id, ...parametroValores };

      const gerente = await tx.gerente.create({
        data: {
          nome: 'Gerente Exemplo',
          telefone: '(31) 99999-0000',
          email: 'gerente@mvp.local',
          cargo: 'GERENTE',
          usuario: {
            create: { email: 'gerente@mvp.local', senhaHash: hashGerente, perfil: 'GERENTE' },
          },
        },
      });

      const [moto, carro, van] = await Promise.all([
        tx.veiculo.create({
          data: { placa: 'MOT1A23', modelo: 'Honda CG 160', tipo: 'MOTO', kmPorLitro: 35 },
        }),
        tx.veiculo.create({
          data: { placa: 'CAR2B34', modelo: 'Fiat Strada', tipo: 'CARRO', kmPorLitro: 12 },
        }),
        tx.veiculo.create({
          data: { placa: 'VAN3C45', modelo: 'Renault Master', tipo: 'VAN', kmPorLitro: 9 },
        }),
      ]);

      const criarMotorista = (
        nome: string,
        email: string,
        documento: string,
        telefone: string,
        veiculoId: string,
      ) =>
        tx.motorista.create({
          data: {
            nome,
            telefone,
            documento,
            gerente: { connect: { id: gerente.id } },
            veiculo: { connect: { id: veiculoId } },
            usuario: { create: { email, senhaHash: hashMotorista, perfil: 'MOTORISTA' } },
          },
        });
      const joao = await criarMotorista(
        'João Silva',
        'joao@mvp.local',
        '123.456.789-09',
        '(31) 98888-0001',
        carro.id,
      );
      const maria = await criarMotorista(
        'Maria Souza',
        'maria@mvp.local',
        '987.654.321-00',
        '(31) 98888-0002',
        moto.id,
      );
      const carlos = await criarMotorista(
        'Carlos Lima',
        'carlos@mvp.local',
        '111.444.777-35',
        '(31) 98888-0003',
        van.id,
      );

      const criarPontos = (lista: typeof PONTOS_EXEMPLO) =>
        Promise.all(lista.map((p) => tx.ponto.create({ data: p })));
      const exemplo: PontoSeed[] = (await criarPontos(PONTOS_EXEMPLO)).map((p) => ({
        id: p.id,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
      }));
      const extras: PontoSeed[] = (await criarPontos(PONTOS_EXTRAS)).map((p) => ({
        id: p.id,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
      }));

      const ontem = somarDias(hoje, -1);
      const equipe = [
        {
          motorista: joao,
          veiculo: { id: carro.id, kmPorLitro: 12 },
          tempos: [15, 10, 50],
          deslocamentos: [20, 25, 30],
        },
        {
          motorista: maria,
          veiculo: { id: moto.id, kmPorLitro: 35 },
          tempos: [10, 5, 26],
          deslocamentos: [15, 20, 20],
        },
        {
          motorista: carlos,
          veiculo: { id: van.id, kmPorLitro: 9 },
          tempos: [5, 10, 30],
          deslocamentos: [25, 25, 30],
        },
      ];

      // Roteiros A, B e C do exemplo do documento (ontem, partida às 08:00).
      const roteiros: RoteiroGerado[] = equipe.map((e, i) =>
        montarRoteiroFinalizado({
          data: ontem,
          partida: '08:00',
          motoristaId: e.motorista.id,
          gerenteId: gerente.id,
          veiculo: e.veiculo,
          parametro: param,
          pontos: exemplo,
          deslocamentosMin: e.deslocamentos,
          temposParadaMin: e.tempos,
          codigoPedido: (ordem) => `PED-${1000 + i * 10 + ordem}`,
        }),
      );

      // 90 dias de histórico aleatório (dias úteis, sem o dia de ontem, já usado pelos roteiros A/B/C).
      const rnd = criarAleatorio(20260924);
      const destinos = [...exemplo.slice(1), ...extras];
      for (let d = 90; d >= 2; d--) {
        const data = somarDias(hoje, -d);
        const semana = diaDaSemana(data);
        if (semana === 0 || semana === 6) continue;
        for (const e of equipe) {
          roteiros.push(
            montarRoteiroAleatorio(rnd, {
              data,
              motoristaId: e.motorista.id,
              gerenteId: gerente.id,
              veiculo: e.veiculo,
              parametro: param,
              partida: exemplo[0],
              destinos,
            }),
          );
        }
      }

      await tx.roteiro.createMany({ data: roteiros.map((r) => r.roteiro) });
      await tx.pontoRoteiro.createMany({ data: roteiros.flatMap((r) => r.paradas) });
    },
    { timeout: 60000 },
  );

  return true;
}
