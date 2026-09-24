export const FUSO = 'America/Sao_Paulo';

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. */
export function hojeLocal(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(agora);
}

/** Converte 'AAAA-MM-DD' no Date usado pelas colunas `@db.Date` (meia-noite UTC). */
export function paraColunaData(data: string): Date {
  return new Date(`${data}T00:00:00.000Z`);
}

/** Converte o valor de uma coluna `@db.Date` em 'AAAA-MM-DD'. */
export function deColunaData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Soma dias a uma data 'AAAA-MM-DD'. */
export function somarDias(data: string, dias: number): string {
  const d = paraColunaData(data);
  d.setUTCDate(d.getUTCDate() + dias);
  return deColunaData(d);
}

/** Dia da semana (0 = domingo) de uma data 'AAAA-MM-DD'. */
export function diaDaSemana(data: string): number {
  return paraColunaData(data).getUTCDay();
}

/** Data/hora local de São Paulo (UTC−3, sem horário de verão desde 2019). */
export function horarioLocal(data: string, hhmm: string): Date {
  return new Date(`${data}T${hhmm}:00-03:00`);
}
