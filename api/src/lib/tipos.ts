import type { Perfil } from '@prisma/client';

/** Dados do usuário autenticado, extraídos do JWT. */
export interface UsuarioAutenticado {
  id: string;
  perfil: Perfil;
  motoristaId?: string;
  gerenteId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
      /** Query string já validada pelo middleware `validar`. */
      consulta?: unknown;
    }
  }
}
