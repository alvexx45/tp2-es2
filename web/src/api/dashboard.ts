import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './cliente.ts';
import type { DashboardDia, DashboardMes, DashboardPeriodo } from './tipos.ts';

const opcoes = { placeholderData: keepPreviousData, staleTime: 60_000 };

export function useDashboardDia(data: string, motoristaId: string, habilitado: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'dia', data, motoristaId],
    queryFn: () => api.get<DashboardDia>('/dashboard/dia', { data, motoristaId }),
    enabled: habilitado,
    ...opcoes,
  });
}

export function useDashboardMes(
  ano: number,
  mes: number,
  motoristaId: string,
  habilitado: boolean,
) {
  return useQuery({
    queryKey: ['dashboard', 'mes', ano, mes, motoristaId],
    queryFn: () => api.get<DashboardMes>('/dashboard/mes', { ano, mes, motoristaId }),
    enabled: habilitado,
    ...opcoes,
  });
}

export function useDashboardPeriodo(
  inicio: string,
  fim: string,
  motoristaId: string,
  habilitado: boolean,
) {
  return useQuery({
    queryKey: ['dashboard', 'periodo', inicio, fim, motoristaId],
    queryFn: () => api.get<DashboardPeriodo>('/dashboard/periodo', { inicio, fim, motoristaId }),
    enabled: habilitado,
    ...opcoes,
  });
}
