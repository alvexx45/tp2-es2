import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PontoSerie } from '../../api/tipos.ts';
import {
  formatarData,
  formatarDataHora,
  formatarDuracao,
  formatarNumero,
} from '../../lib/formatos.ts';
import { Dica } from './Dica.tsx';
import { eixo, TEMA } from './tema.ts';

type Medida = 'tempo' | 'percentual';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function rotuloBucket(data: string, agrupamento: 'dia' | 'mes') {
  const [a, m, d] = data.split('-');
  return agrupamento === 'mes' ? `${MESES[Number(m) - 1]}/${a.slice(2)}` : `${d}/${m}`;
}

/** Tooltip: valor do ponto + a maior parada do dia/mês (endereço e data/hora). */
function DicaSerie({
  p,
  medida,
  agrupamento,
}: {
  p: PontoSerie;
  medida: Medida;
  agrupamento: 'dia' | 'mes';
}) {
  const valor =
    medida === 'tempo'
      ? formatarDuracao(p.tempoParadoMin)
      : formatarNumero(p.percentualJornada, ' % da jornada');
  const titulo = agrupamento === 'mes' ? rotuloBucket(p.data, 'mes') : formatarData(p.data);
  const linhas = [
    `${p.paradas} paradas em ${p.roteiros} roteiros${p.alertas ? ` · ⚠ ${p.alertas} em alerta` : ''}`,
  ];
  if (p.maiorParada) {
    linhas.push(
      `Maior parada: ${formatarDuracao(p.maiorParada.tempoParadoMin)} em ${p.maiorParada.endereco}`,
    );
    linhas.push(`${p.maiorParada.motorista} · ${formatarDataHora(p.maiorParada.chegadaEm)}`);
  }
  return <Dica titulo={titulo} valor={valor} linhas={linhas} />;
}

interface Props {
  serie: PontoSerie[];
  medida: Medida;
  agrupamento?: 'dia' | 'mes';
}

const valorDe = (medida: Medida) => (medida === 'tempo' ? 'tempoParadoMin' : 'percentualJornada');
/** Ticks do eixo: minutos até 2 h; acima disso, horas (evita rótulos como "12000 min"). */
const formatarTick = (medida: Medida) => (v: number) =>
  medida === 'percentual' ? `${v} %` : v >= 120 ? `${Math.round(v / 60)} h` : `${v} min`;

/** Ticks redondos em horas quando o máximo passa de 2 h (senão o Recharts escolhe múltiplos de minutos). */
function ticksTempo(serie: PontoSerie[], medida: Medida): number[] | undefined {
  if (medida !== 'tempo') return undefined;
  const maxHoras = Math.max(0, ...serie.map((p) => p.tempoParadoMin)) / 60;
  if (maxHoras <= 2) return undefined;
  const passo = [1, 2, 5, 10, 20, 50, 100, 200, 500].find((p) => maxHoras / p <= 5) ?? 1000;
  const ticks = [];
  for (let h = 0; h <= maxHoras + passo; h += passo) ticks.push(h * 60);
  return ticks;
}

/** Dias sem roteiro não têm % da jornada: viram lacuna na linha em vez de um falso 0 %. */
function paraGrafico(serie: PontoSerie[], medida: Medida) {
  return serie.map((p) => ({
    ...p,
    percentualJornada: medida === 'percentual' && p.roteiros === 0 ? null : p.percentualJornada,
  }));
}

/** Barras por dia (recorte Mês). Dias com parada em alerta ficam em vermelho. */
export function GraficoBarrasSerie({ serie, medida, agrupamento = 'dia' }: Props) {
  return (
    <div className="grafico">
      <ResponsiveContainer>
        <BarChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={TEMA.grade} />
          <XAxis
            dataKey="data"
            {...eixo}
            tickFormatter={(d: string) => rotuloBucket(d, agrupamento)}
            minTickGap={12}
          />
          <YAxis
            {...eixo}
            tickFormatter={formatarTick(medida)}
            ticks={ticksTempo(serie, medida)}
            width={56}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(79,70,229,0.08)' }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <DicaSerie
                  p={payload[0].payload as PontoSerie}
                  medida={medida}
                  agrupamento={agrupamento}
                />
              ) : null
            }
          />
          <Bar
            dataKey={valorDe(medida)}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          >
            {serie.map((p) => (
              <Cell key={p.data} fill={p.alertas > 0 ? TEMA.critico : TEMA.serie} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Linha (tempo parado no período ou % da jornada por dia), com crosshair no hover. */
export function GraficoLinhaSerie({ serie, medida, agrupamento = 'dia' }: Props) {
  return (
    <div className="grafico">
      <ResponsiveContainer>
        <LineChart
          data={paraGrafico(serie, medida)}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke={TEMA.grade} />
          <XAxis
            dataKey="data"
            {...eixo}
            tickFormatter={(d: string) => rotuloBucket(d, agrupamento)}
            minTickGap={16}
          />
          <YAxis
            {...eixo}
            tickFormatter={formatarTick(medida)}
            ticks={ticksTempo(serie, medida)}
            width={56}
          />
          <Tooltip
            cursor={{ stroke: TEMA.eixo }}
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <DicaSerie
                  p={payload[0].payload as PontoSerie}
                  medida={medida}
                  agrupamento={agrupamento}
                />
              ) : null
            }
          />
          <Line
            type="linear"
            connectNulls={false}
            dataKey={valorDe(medida)}
            stroke={TEMA.serie}
            strokeWidth={2}
            dot={serie.length <= 31 ? { r: 3, fill: TEMA.serie, strokeWidth: 0 } : false}
            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
