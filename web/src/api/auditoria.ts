import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './cliente.ts';
import type { Filtros } from './crud.ts';
import type { LogAuditoria, Pagina } from './tipos.ts';

export function useAuditoria(filtros: Filtros) {
  return useQuery({
    queryKey: ['auditoria', filtros],
    queryFn: () => api.get<Pagina<LogAuditoria>>('/auditoria', filtros),
    placeholderData: keepPreviousData,
  });
}
