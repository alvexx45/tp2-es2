import { prisma } from '../db/prisma.ts';
import { executarSeed } from './seed.ts';

try {
  const criou = await executarSeed(prisma);
  console.log(
    criou ? 'Seed executado com sucesso.' : 'Seed já executado anteriormente — nada a fazer.',
  );
} finally {
  await prisma.$disconnect();
}
