import { PrismaClient } from '@prisma/client';

/** Instância única do Prisma Client (Seção 3.1). */
export const prisma = new PrismaClient();
