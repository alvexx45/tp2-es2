import type { StatusRoteiro } from '../api/tipos.ts';

const ROTULOS: Record<StatusRoteiro, string> = {
  PLANEJADO: 'Planejado',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

export function SeloStatus({ status }: { status: StatusRoteiro }) {
  return <span className={`selo selo-${status}`}>{ROTULOS[status]}</span>;
}

export function SeloAlerta() {
  return (
    <span className="selo selo-alerta" title="Parada acima do limite de alerta">
      ⚠️ Alerta
    </span>
  );
}
