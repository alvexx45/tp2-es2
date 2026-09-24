import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './cliente.ts';
import type { Pagina, Parametros } from './tipos.ts';

export function useParametroVigente() {
  return useQuery({
    queryKey: ['parametros', 'vigente'],
    queryFn: () => api.get<Parametros>('/parametros/vigente'),
  });
}

export function useVersoesParametros(pagina: number) {
  return useQuery({
    queryKey: ['parametros', 'versoes', pagina],
    queryFn: () => api.get<Pagina<Parametros>>('/parametros', { pagina, tamanho: 10 }),
  });
}

export function useSalvarParametros(grupo: 'custos' | 'jornada') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: Partial<Parametros>) => api.post<Parametros>(`/parametros/${grupo}`, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parametros'] }),
  });
}
