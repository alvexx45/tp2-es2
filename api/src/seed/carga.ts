import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { diaDaSemana, hojeLocal, somarDias } from '../lib/datas.ts';
import {
  criarAleatorio,
  montarRoteiroAleatorio,
  type PontoSeed,
  type RoteiroGerado,
} from './gerador.ts';

export const PREFIXO_EMAIL_CARGA = 'carga';
const MOTORISTAS = 20;
const PARADAS_POR_ROTEIRO = 8;

/**
 * Massa para o teste de desempenho (RNF03): 12 meses × 20 motoristas × dias úteis × 8 paradas (~40 mil paradas).
 * Exige o seed principal (usa o gerente, os pontos e o parâmetro dele). Idempotente.
 */
export async function executarSeedCarga(prisma: PrismaClient, hoje = hojeLocal()): Promise<number> {
  if (await prisma.usuario.findUnique({ where: { email: `${PREFIXO_EMAIL_CARGA}01@mvp.local` } }))
    return 0;

  const gerente = await prisma.gerente.findUniqueOrThrow({ where: { email: 'gerente@mvp.local' } });
  const parametro = await prisma.parametroSistema.findFirstOrThrow({
    orderBy: { vigenteDesde: 'asc' },
  });
  const veiculo = await prisma.veiculo.findFirstOrThrow({ where: { tipo: 'CARRO' } });
  const pontos: PontoSeed[] = (await prisma.ponto.findMany({ orderBy: { criadoEm: 'asc' } })).map(
    (p) => ({
      id: p.id,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
    }),
  );
  const [partida, ...destinos] = pontos;
  const senhaHash = await bcrypt.hash('motorista123', 10);

  const motoristas = [];
  for (let i = 1; i <= MOTORISTAS; i++) {
    const n = String(i).padStart(2, '0');
    motoristas.push(
      await prisma.motorista.create({
        data: {
          nome: `Motorista Carga ${n}`,
          gerente: { connect: { id: gerente.id } },
          veiculo: { connect: { id: veiculo.id } },
          usuario: {
            create: {
              email: `${PREFIXO_EMAIL_CARGA}${n}@mvp.local`,
              senhaHash,
              perfil: 'MOTORISTA',
            },
          },
        },
      }),
    );
  }

  const param = {
    id: parametro.id,
    valorCombustivelLitro: Number(parametro.valorCombustivelLitro),
    kmPorLitroPadrao: Number(parametro.kmPorLitroPadrao),
    custoOperacionalPorKm: Number(parametro.custoOperacionalPorKm),
    fatorCorrecaoRota: Number(parametro.fatorCorrecaoRota),
    jornadaPadraoHoras: Number(parametro.jornadaPadraoHoras),
    tempoMinimoParadaMin: parametro.tempoMinimoParadaMin,
  };

  const rnd = criarAleatorio(12345);
  let lote: RoteiroGerado[] = [];
  let paradas = 0;
  const gravar = async () => {
    await prisma.$transaction([
      prisma.roteiro.createMany({ data: lote.map((r) => r.roteiro) }),
      prisma.pontoRoteiro.createMany({ data: lote.flatMap((r) => r.paradas) }),
    ]);
    lote = [];
  };

  for (let d = 365; d >= 1; d--) {
    const data = somarDias(hoje, -d);
    const semana = diaDaSemana(data);
    if (semana === 0 || semana === 6) continue;
    for (const m of motoristas) {
      const r = montarRoteiroAleatorio(rnd, {
        data,
        motoristaId: m.id,
        gerenteId: gerente.id,
        veiculo: { id: veiculo.id, kmPorLitro: Number(veiculo.kmPorLitro) },
        parametro: param,
        partida,
        destinos,
        minParadas: PARADAS_POR_ROTEIRO,
        maxParadas: PARADAS_POR_ROTEIRO,
      });
      paradas += r.paradas.length - 1;
      lote.push(r);
      if (lote.length >= 500) await gravar();
    }
  }
  if (lote.length) await gravar();
  return paradas;
}
