import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './cliente.ts';
import type { Filtros } from './crud.ts';
import type {
  DadosRoteiro,
  Pagina,
  Parada,
  Roteiro,
  RoteiroResumo,
  StatusRoteiro,
} from './tipos.ts';

const CHAVE = ['roteiros'];

export function useRoteiros(filtros: Filtros) {
  return useQuery({
    queryKey: [...CHAVE, 'lista', filtros],
    queryFn: () => api.get<Pagina<RoteiroResumo>>('/roteiros', filtros),
    placeholderData: keepPreviousData,
  });
}

export function useRoteiro(id: string | undefined) {
  return useQuery({
    queryKey: [...CHAVE, 'item', id],
    queryFn: () => api.get<Roteiro>(`/roteiros/${id}`),
    enabled: Boolean(id),
  });
}

/** Roteiro do motorista logado numa data (padrão: hoje). */
export function useMeuRoteiro(data?: string) {
  return useQuery({
    queryKey: [...CHAVE, 'meu', data ?? 'hoje'],
    queryFn: () => api.get<{ roteiro: Roteiro | null }>('/roteiros/meus', { data }),
    refetchInterval: 60_000,
  });
}

export function useMeusRoteiros(filtros: Filtros) {
  return useQuery({
    queryKey: [...CHAVE, 'meus', filtros],
    queryFn: () => api.get<Pagina<RoteiroResumo>>('/roteiros/meus', filtros),
    placeholderData: keepPreviousData,
  });
}

function useMutacaoRoteiros<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useSalvarRoteiro() {
  return useMutacaoRoteiros(({ id, dados }: { id?: string; dados: DadosRoteiro }) =>
    id ? api.put<Roteiro>(`/roteiros/${id}`, dados) : api.post<Roteiro>('/roteiros', dados),
  );
}

export function useCancelarRoteiro() {
  return useMutacaoRoteiros((id: string) => api.post<Roteiro>(`/roteiros/${id}/cancelar`));
}

export function useRegistrarHorario() {
  return useMutacaoRoteiros(
    (v: {
      roteiroId: string;
      paradaId: string;
      tipo: 'chegada' | 'saida';
      latitude?: number;
      longitude?: number;
    }) =>
      api.post<Parada & { tempoTotalParadoMin: number; statusRoteiro: StatusRoteiro }>(
        `/roteiros/${v.roteiroId}/paradas/${v.paradaId}/${v.tipo}`,
        { latitude: v.latitude, longitude: v.longitude },
      ),
  );
}

export function useCorrigirHorario() {
  return useMutacaoRoteiros(
    (v: {
      roteiroId: string;
      paradaId: string;
      chegadaEm?: string | null;
      saidaEm?: string | null;
    }) =>
      api.patch<Roteiro>(`/roteiros/${v.roteiroId}/paradas/${v.paradaId}`, {
        chegadaEm: v.chegadaEm,
        saidaEm: v.saidaEm,
      }),
  );
}

export function useFinalizarRoteiro() {
  return useMutacaoRoteiros((v: { roteiroId: string; kmInformado?: number | null }) =>
    api.post<Roteiro>(`/roteiros/${v.roteiroId}/finalizar`, { kmInformado: v.kmInformado ?? null }),
  );
}
