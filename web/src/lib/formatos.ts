const FUSO = 'America/Sao_Paulo';

/** 75 → "1 h 15 min"; 45 → "45 min"; 120 → "2 h". */
export function formatarDuracao(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined) return '—';
  const total = Math.round(minutos);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** "2026-09-24" ou ISO completo → "24/09/2026". */
export function formatarData(valor: string | null | undefined): string {
  if (!valor) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split('-');
    return `${d}/${m}/${a}`;
  }
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, dateStyle: 'short' }).format(
    new Date(valor),
  );
}

/** ISO → "08:20". */
export function formatarHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor));
}

/** ISO → "24/09/2026 08:20". */
export function formatarDataHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** 7.5 → "R$ 7,50". */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return moeda.format(valor).replace(/\u00a0/g, ' ');
}

export function formatarNumero(valor: number | null | undefined, sufixo = ''): string {
  if (valor === null || valor === undefined) return '—';
  return `${decimal.format(valor)}${sufixo}`;
}

/** Data de hoje (AAAA-MM-DD) no fuso de São Paulo. */
export function hoje(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
}

/** Converte ISO em valor para <input type="datetime-local"> no fuso de São Paulo. */
export function paraInputDataHora(valor: string | null | undefined): string {
  if (!valor) return '';
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(valor));
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Valor de <input type="datetime-local"> (horário de São Paulo, UTC−3) → ISO com fuso. */
export function deInputDataHora(valor: string): string | null {
  if (!valor) return null;
  return `${valor}:00-03:00`;
}
