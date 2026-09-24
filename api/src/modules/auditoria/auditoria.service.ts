import type { AcaoAuditoria, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma.ts';
import { mascararDocumento } from '../../lib/serializar.ts';

type Cliente = Prisma.TransactionClient | typeof prisma;

export interface RegistroAuditoria {
  entidade: string;
  entidadeId: string;
  acao: AcaoAuditoria;
  valorAnterior?: unknown;
  valorNovo?: unknown;
  usuarioId: string;
}

/** Remove `senhaHash` e mascara `documento` antes de gravar no log (Seção 11). */
function sanitizar(valor: unknown): Prisma.InputJsonValue | undefined {
  if (valor === undefined || valor === null) return undefined;
  const json = JSON.parse(JSON.stringify(valor), (chave, v) => {
    if (chave === 'senhaHash' || chave === 'senha') return undefined;
    if (chave === 'documento') return mascararDocumento(v);
    return v;
  });
  return json as Prisma.InputJsonValue;
}

/** Registra a alteração na mesma transação (`tx`) da escrita auditada (RNF05). */
export async function registrar(tx: Cliente, r: RegistroAuditoria): Promise<void> {
  await tx.logAuditoria.create({
    data: {
      entidade: r.entidade,
      entidadeId: r.entidadeId,
      acao: r.acao,
      valorAnterior: sanitizar(r.valorAnterior),
      valorNovo: sanitizar(r.valorNovo),
      usuarioId: r.usuarioId,
    },
  });
}
