import { z } from 'zod';

export const esquemaPaginacao = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamanho: z.coerce.number().int().min(1).max(200).default(20),
});

export type Paginacao = z.infer<typeof esquemaPaginacao>;

export function paginar(p: Paginacao) {
  return { skip: (p.pagina - 1) * p.tamanho, take: p.tamanho };
}

export function pagina<T>(itens: T[], total: number, p: Paginacao) {
  return { itens, total, pagina: p.pagina, tamanho: p.tamanho };
}
