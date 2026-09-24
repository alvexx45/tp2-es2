import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ParadaDashboard } from '../../api/tipos.ts';
import { formatarDuracao, formatarHora } from '../../lib/formatos.ts';
import { Dica } from './Dica.tsx';
import { eixo, TEMA } from './tema.ts';

const ALTURA_BARRA = 30;

/**
 * Recorte "Dia": tempo parado por parada (rótulo "ordem — endereço"), agrupado por motorista.
 * Barras horizontais para caber endereços longos; paradas em alerta em vermelho com ⚠.
 */
export function GraficoParadasDia({ paradas }: { paradas: ParadaDashboard[] }) {
  // No celular o rótulo ocupa menos espaço para sobrar largura para as barras.
  const estreito = typeof window !== 'undefined' && window.innerWidth < 600;
  const larguraRotulo = estreito ? 120 : 210;
  const maxCaracteres = estreito ? 18 : 34;
  const dados = paradas.map((p, i) => ({
    ...p,
    chave: i,
    rotulo: `${p.alerta ? '⚠ ' : ''}${p.ordem} — ${p.endereco}`,
    primeiroDoMotorista: i === 0 || paradas[i - 1].motoristaId !== p.motoristaId,
  }));

  return (
    <div style={{ width: '100%', height: Math.max(160, dados.length * ALTURA_BARRA + 40) }}>
      <ResponsiveContainer>
        <BarChart
          data={dados}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
          barCategoryGap={4}
        >
          <CartesianGrid horizontal={false} stroke={TEMA.grade} />
          <XAxis type="number" {...eixo} unit=" min" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="chave"
            width={larguraRotulo}
            {...eixo}
            tickFormatter={(chave: number) => {
              const d = dados[chave];
              const texto = `${d.motorista.split(' ')[0]} · ${d.rotulo}`;
              return texto.length > maxCaracteres ? `${texto.slice(0, maxCaracteres - 1)}…` : texto;
            }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(42,120,214,0.08)' }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload;
              if (!p) return null;
              return (
                <Dica
                  valor={`${formatarDuracao(p.tempoParadoMin)}${p.alerta ? ' ⚠ alerta' : ''}`}
                  titulo={`${p.ordem} — ${p.endereco}`}
                  linhas={[
                    p.motorista,
                    `Chegada ${formatarHora(p.chegadaEm)} · Saída ${formatarHora(p.saidaEm)}`,
                    p.codigoPedido ? `Pedido ${p.codigoPedido}` : null,
                  ].filter(Boolean)}
                />
              );
            }}
          />
          <Bar
            dataKey="tempoParadoMin"
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            isAnimationActive={false}
          >
            {dados.map((d) => (
              <Cell key={d.chave} fill={d.alerta ? TEMA.critico : TEMA.serie} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
