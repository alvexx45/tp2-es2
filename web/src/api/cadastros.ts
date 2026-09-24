import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './cliente.ts';
import { criarHooksCrud } from './crud.ts';
import type { Gerente, Motorista, Ponto, Usuario, Veiculo } from './tipos.ts';

export const pontosApi = criarHooksCrud<Ponto>('pontos');
export const veiculosApi = criarHooksCrud<Veiculo>('veiculos');
export const gerentesApi = criarHooksCrud<Gerente, Partial<Gerente> & { senha?: string }>(
  'gerentes',
);
export const motoristasApi = criarHooksCrud<
  Motorista,
  {
    nome: string;
    telefone: string | null;
    documento: string | null;
    veiculoId: string | null;
    gerenteId?: string;
    email?: string;
    senha?: string;
    ativo?: boolean;
  }
>('motoristas');
export const usuariosApi = criarHooksCrud<Usuario>('usuarios');

export function useAnonimizarMotorista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Motorista>(`/motoristas/${id}/anonimizar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['motoristas'] }),
  });
}

export function useAtualizarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      dados,
    }: {
      id: string;
      dados: { perfil?: string; ativo?: boolean; senha?: string };
    }) => api.patch<Usuario>(`/usuarios/${id}`, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
