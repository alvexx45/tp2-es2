import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './cliente.ts';
import type { Filtros } from './crud.ts';
import type { ItemHistorico, Pagina } from './tipos.ts';

export function useHistorico(filtros: Filtros) {
  return useQuery({
    queryKey: ['historico', filtros],
    queryFn: () =>
      api.get<Pagina<ItemHistorico> & { inicio: string; fim: string }>('/historico', filtros),
    placeholderData: keepPreviousData,
  });
}

/** Baixa o CSV do histórico com os mesmos filtros da tela (RF12). */
export async function baixarCsv(filtros: Filtros) {
  const blob = await api.arquivo('/historico/exportar.csv', filtros);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `historico-tempo-parado-${filtros.inicio ?? ''}-a-${filtros.fim ?? ''}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
