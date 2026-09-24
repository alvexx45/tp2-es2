import type { Perfil } from '../api/tipos.ts';

/** Tela inicial de cada perfil após o login. */
export function rotaInicial(perfil: Perfil): string {
  return perfil === 'MOTORISTA' ? '/motorista' : '/dashboard';
}
