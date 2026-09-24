import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';

/**
 * Recria o banco de teste (<POSTGRES_DB>_test) do zero antes da suíte: DROP/CREATE DATABASE,
 * `prisma migrate deploy` e o seed da Seção 12. Só atua em bancos cujo nome termina em `_test`.
 */
export default async function setup() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  const banco = url.pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/.test(banco)) {
    throw new Error(`Recusando recriar um banco que não é de teste: ${banco}`);
  }

  const urlAdmin = new URL(url);
  urlAdmin.pathname = '/postgres';
  const admin = new PrismaClient({ datasourceUrl: urlAdmin.toString() });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${banco}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${banco}"`);
  } finally {
    await admin.$disconnect();
  }

  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env });
  const { prisma } = await import('../db/prisma.ts');
  const { executarSeed } = await import('../seed/seed.ts');
  await executarSeed(prisma);
  await prisma.$disconnect();
}
