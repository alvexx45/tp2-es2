import type { Prisma } from '@prisma/client';
import type { UsuarioAutenticado } from './tipos.ts';

/** Escopo de dados por perfil (Seção 7) aplicado a consultas de motoristas. */
export function escopoMotoristas(u: UsuarioAutenticado): Prisma.MotoristaWhereInput {
  if (u.perfil === 'ADMIN') return {};
  if (u.perfil === 'GERENTE') return { gerenteId: u.gerenteId ?? '-' };
  return { id: u.motoristaId ?? '-' };
}

/** Escopo de dados por perfil (Seção 7) aplicado a consultas de roteiros. */
export function escopoRoteiros(u: UsuarioAutenticado): Prisma.RoteiroWhereInput {
  if (u.perfil === 'ADMIN') return {};
  if (u.perfil === 'GERENTE') return { motorista: { gerenteId: u.gerenteId ?? '-' } };
  return { motoristaId: u.motoristaId ?? '-' };
}
