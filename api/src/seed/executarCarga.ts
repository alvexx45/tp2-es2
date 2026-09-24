import { prisma } from '../db/prisma.ts';
import { executarSeed } from './seed.ts';
import { executarSeedCarga } from './carga.ts';

try {
  await executarSeed(prisma);
  const inicio = Date.now();
  const paradas = await executarSeedCarga(prisma);
  console.log(
    paradas
      ? `Massa de carga criada: ${paradas} paradas em ${((Date.now() - inicio) / 1000).toFixed(1)} s.`
      : 'Massa de carga já existe — nada a fazer.',
  );
} finally {
  await prisma.$disconnect();
}
