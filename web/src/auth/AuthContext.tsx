import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth.ts';
import { aoSessaoExpirar, definirToken, obterToken } from '../api/cliente.ts';
import type { UsuarioLogado } from '../api/tipos.ts';

interface ContextoAuth {
  usuario: UsuarioLogado | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<UsuarioLogado>;
  sair: () => void;
}

const Contexto = createContext<ContextoAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [carregando, setCarregando] = useState(() => obterToken() !== null);

  const sair = useCallback(() => {
    definirToken(null);
    setUsuario(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    aoSessaoExpirar(sair);
    if (!obterToken()) return;
    authApi
      .me()
      .then(setUsuario)
      .catch(() => sair())
      .finally(() => setCarregando(false));
  }, [sair]);

  const entrar = useCallback(async (email: string, senha: string) => {
    const resposta = await authApi.login(email, senha);
    definirToken(resposta.token);
    setUsuario(resposta.usuario);
    return resposta.usuario;
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, sair }),
    [usuario, carregando, entrar, sair],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ContextoAuth {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
