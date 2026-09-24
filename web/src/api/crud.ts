import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './cliente.ts';
import type { Pagina } from './tipos.ts';

export type Filtros = Record<string, string | number | boolean | null | undefined>;

/** Hooks TanStack Query para um recurso REST com listagem paginada e CRUD. */
export function criarHooksCrud<T extends { id: string }, D = Partial<T>>(recurso: string) {
  const chave = [recurso];

  return {
    useListar: (filtros: Filtros = {}, habilitado = true) =>
      useQuery({
        queryKey: [...chave, 'lista', filtros],
        queryFn: () => api.get<Pagina<T>>(`/${recurso}`, filtros),
        placeholderData: keepPreviousData,
        enabled: habilitado,
      }),

    useObter: (id: string | undefined) =>
      useQuery({
        queryKey: [...chave, 'item', id],
        queryFn: () => api.get<T>(`/${recurso}/${id}`),
        enabled: Boolean(id),
      }),

    useSalvar: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({ id, dados }: { id?: string; dados: D }) =>
          id ? api.put<T>(`/${recurso}/${id}`, dados) : api.post<T>(`/${recurso}`, dados),
        onSuccess: () => qc.invalidateQueries({ queryKey: chave }),
      });
    },

    useInativar: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (id: string) => api.delete<T>(`/${recurso}/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: chave }),
      });
    },
  };
}
