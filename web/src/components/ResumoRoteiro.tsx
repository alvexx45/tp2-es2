import type { Roteiro } from '../api/tipos.ts';
import { formatarDuracao, formatarMoeda, formatarNumero } from '../lib/formatos.ts';
import { Indicador } from './Indicador.tsx';

/** Indicadores do roteiro (UC09/UC10): tempo parado, % da jornada, distância e custo. */
export function ResumoRoteiro({ roteiro }: { roteiro: Roteiro }) {
  const paradas = roteiro.paradas.filter((p) => p.ordem > 1);
  return (
    <div className="indicadores">
      <Indicador rotulo="Tempo parado" valor={formatarDuracao(roteiro.tempoTotalParadoMin)} />
      <Indicador rotulo="% da jornada" valor={formatarNumero(roteiro.percentualJornada, ' %')} />
      <Indicador
        rotulo="Paradas"
        valor={`${paradas.filter((p) => p.saidaEm).length}/${paradas.length}`}
      />
      <Indicador rotulo="Distância" valor={formatarNumero(roteiro.distanciaTotalKm, ' km')} />
      <Indicador
        rotulo="Custo estimado"
        valor={
          roteiro.custoEstimado === null
            ? '—'
            : `${formatarMoeda(roteiro.custoEstimado)}${roteiro.custoPorKm !== null ? ` · ${formatarMoeda(roteiro.custoPorKm)}/km` : ''}`
        }
      />
    </div>
  );
}
