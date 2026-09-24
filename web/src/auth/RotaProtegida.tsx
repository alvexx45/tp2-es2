import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { Perfil } from '../api/tipos.ts';
import { useAuth } from './AuthContext.tsx';
import { rotaInicial } from './rotas.ts';

/** Exige login e, opcionalmente, um dos perfis informados. */
export function RotaProtegida({ perfis, children }: { perfis?: Perfil[]; children: ReactNode }) {
  const { usuario, carregando } = useAuth();
  const local = useLocation();

  if (carregando) return <p className="carregando">Carregando…</p>;
  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  if (perfis && !perfis.includes(usuario.perfil))
    return <Navigate to={rotaInicial(usuario.perfil)} replace />;
  return <>{children}</>;
}
