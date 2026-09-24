import { api } from './cliente.ts';
import type { UsuarioLogado } from './tipos.ts';

export const authApi = {
  login: (email: string, senha: string) =>
    api.post<{ token: string; usuario: UsuarioLogado }>('/auth/login', { email, senha }),
  me: () => api.get<UsuarioLogado>('/auth/me'),
};
