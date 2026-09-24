import { Prisma, type AcaoAuditoria } from '@prisma/client';
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

export interface FiltrosAuditoria {
  entidade?: string;
  entidadeId?: string;
  usuarioId?: string;
  inicio?: string;
  fim?: string;
  pagina: number;
  tamanho: number;
}

/** Consulta de logs (UC18). `inicio`/`fim` são datas locais (São Paulo), inclusive. */
export async function listar(f: FiltrosAuditoria) {
  const where: Prisma.LogAuditoriaWhereInput = {
    entidade: f.entidade,
    entidadeId: f.entidadeId,
    usuarioId: f.usuarioId,
    dataHora: {
      gte: f.inicio ? new Date(`${f.inicio}T00:00:00-03:00`) : undefined,
      lt: f.fim ? new Date(new Date(`${f.fim}T00:00:00-03:00`).getTime() + 86_400_000) : undefined,
    },
  };
  const [itens, total] = await Promise.all([
    prisma.logAuditoria.findMany({
      where,
      include: { usuario: { select: { id: true, email: true, perfil: true } } },
      orderBy: { dataHora: 'desc' },
      skip: (f.pagina - 1) * f.tamanho,
      take: f.tamanho,
    }),
    prisma.logAuditoria.count({ where }),
  ]);
  return { itens, total, pagina: f.pagina, tamanho: f.tamanho };
}

const CAMPOS_PESSOAIS = ['nome', 'telefone', 'documento', 'email'];

function redigir(valor: Prisma.JsonValue | null): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (valor === null) return Prisma.DbNull;
  if (typeof valor !== 'object' || Array.isArray(valor)) return valor as Prisma.InputJsonValue;
  const copia = { ...valor } as Record<string, Prisma.JsonValue>;
  for (const campo of CAMPOS_PESSOAIS)
    if (campo in copia && copia[campo] !== null) copia[campo] = '(anonimizado)';
  return copia as Prisma.InputJsonValue;
}

/**
 * LGPD (RNF06): na anonimização, remove também os dados pessoais já gravados nos logs da entidade.
 * O registro de *quem* alterou *o quê* e *quando* continua; só os valores pessoais viram "(anonimizado)".
 */
export async function anonimizarRegistros(
  tx: Cliente,
  entidade: string,
  entidadeId: string,
): Promise<void> {
  const logs = await tx.logAuditoria.findMany({ where: { entidade, entidadeId } });
  for (const log of logs) {
    await tx.logAuditoria.update({
      where: { id: log.id },
      data: { valorAnterior: redigir(log.valorAnterior), valorNovo: redigir(log.valorNovo) },
    });
  }
}
