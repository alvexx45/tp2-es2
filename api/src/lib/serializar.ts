import type { Prisma } from '@prisma/client';
import { arredondar } from '../domain/numeros.ts';
import { deColunaData } from './datas.ts';

type Dec = Prisma.Decimal | number | null | undefined;

/** Decimal do Prisma → number arredondado (Seção 13: conversão só na resposta). */
export function num(valor: Dec, casas = 2): number | null {
  if (valor === null || valor === undefined) return null;
  return arredondar(Number(valor), casas);
}

export function dataISO(valor: Date): string {
  return deColunaData(valor);
}

/** Documento mascarado para listagens (LGPD): 123.456.789-09 → ***.456.789-** */
export function mascararDocumento(documento: string | null): string | null {
  if (!documento) return null;
  const digitos = documento.replace(/\D/g, '');
  if (digitos.length === 11) return `***.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-**`;
  if (digitos.length <= 4) return '*'.repeat(digitos.length);
  return `${'*'.repeat(digitos.length - 4)}${digitos.slice(-4, -2)}**`;
}
