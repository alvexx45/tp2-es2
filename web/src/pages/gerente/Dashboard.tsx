import { useState } from 'react';
import { Link } from 'react-router';
import { useDashboardDia, useDashboardMes, useDashboardPeriodo } from '../../api/dashboard.ts';
import type { CardsDashboard, PontoSerie } from '../../api/tipos.ts';
import { GraficoParadasDia } from '../../components/charts/GraficoParadasDia.tsx';
import {
  GraficoBarrasSerie,
  GraficoLinhaSerie,
  rotuloBucket,
} from '../../components/charts/GraficoSerie.tsx';
import { FiltroMotorista } from '../../components/FiltroMotorista.tsx';
import { Indicador } from '../../components/Indicador.tsx';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { SeloAlerta } from '../../components/StatusRoteiro.tsx';
import { somarDias } from '../../lib/datas.ts';
import {
  formatarData,
  formatarDataHora,
  formatarDuracao,
  formatarHora,
  formatarMoeda,
  formatarNumero,
  hoje,
} from '../../lib/formatos.ts';

type Recorte = 'dia' | 'mes' | 'periodo';

function Cards({ cards }: { cards: CardsDashboard }) {
  return (
    <div className="indicadores">
      <Indicador rotulo="Tempo parado" valor={formatarDuracao(cards.tempoTotalParadoMin)} />
      <Indicador rotulo="% da jornada" valor={formatarNumero(cards.percentualJornada, ' %')} />
      <Indicador
        rotulo="Paradas"
        valor={`${cards.paradas}${cards.alertas ? ` · ⚠ ${cards.alertas}` : ''}`}
      />
      <Indicador rotulo="Distância" valor={formatarNumero(cards.distanciaKm, ' km')} />
      <Indicador rotulo="Custo estimado" valor={formatarMoeda(cards.custoEstimado)} />
    </div>
  );
}

function Vazio() {
  return <p className="texto-suave">Nenhuma parada registrada no recorte escolhido.</p>;
}

/** Tabela da série (visão acessível dos gráficos). */
function TabelaSerie({ serie, agrupamento }: { serie: PontoSerie[]; agrupamento: 'dia' | 'mes' }) {
  const linhas = serie.filter((p) => p.paradas > 0);
  return (
    <details>
      <summary>Ver dados em tabela</summary>
      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>{agrupamento === 'mes' ? 'Mês' : 'Data'}</th>
              <th className="numero">Tempo parado</th>
              <th className="numero">% jornada</th>
              <th className="numero">Paradas</th>
              <th>Maior parada</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((p) => (
              <tr key={p.data}>
                <td>
                  {agrupamento === 'mes' ? rotuloBucket(p.data, 'mes') : formatarData(p.data)}
                </td>
                <td className="numero">{formatarDuracao(p.tempoParadoMin)}</td>
                <td className="numero">{formatarNumero(p.percentualJornada, ' %')}</td>
                <td className="numero">
                  {p.paradas} {p.alertas > 0 && <SeloAlerta />}
                </td>
                <td>
                  {p.maiorParada &&
                    `${formatarDuracao(p.maiorParada.tempoParadoMin)} · ${p.maiorParada.endereco} · ${formatarDataHora(p.maiorParada.chegadaEm)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function RecorteDia({ motoristaId }: { motoristaId: string }) {
  const [data, setData] = useState(somarDias(hoje(), -1));
  const consulta = useDashboardDia(data, motoristaId, true);
  const d = consulta.data;
  return (
    <>
      <div className="filtros">
        <label>
          Data
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
      </div>
      <MensagemErro erro={consulta.error} />
      {d && (
        <>
          <Cards cards={d.cards} />
          <div className="cartao">
            <h2 style={{ marginTop: 0 }}>Tempo parado por parada</h2>
            {d.paradas.length ? <GraficoParadasDia paradas={d.paradas} /> : <Vazio />}
          </div>
          <div className="cartao tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Motorista</th>
                  <th>#</th>
                  <th>Endereço</th>
                  <th>Chegada</th>
                  <th>Saída</th>
                  <th className="numero">Tempo</th>
                  <th>Alerta</th>
                </tr>
              </thead>
              <tbody>
                {d.paradas.map((p) => (
                  <tr key={p.paradaId} className={p.alerta ? 'linha-alerta' : undefined}>
                    <td>
                      <Link to={`/roteiros/${p.roteiroId}`}>{p.motorista}</Link>
                    </td>
                    <td>{p.ordem}</td>
                    <td>{p.endereco}</td>
                    <td>{formatarHora(p.chegadaEm)}</td>
                    <td>{formatarHora(p.saidaEm)}</td>
                    <td className="numero">{formatarDuracao(p.tempoParadoMin)}</td>
                    <td>{p.alerta ? <SeloAlerta /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function RecorteMes({ motoristaId }: { motoristaId: string }) {
  const [mesAno, setMesAno] = useState(hoje().slice(0, 7));
  const [ano, mes] = mesAno.split('-').map(Number);
  const consulta = useDashboardMes(ano, mes, motoristaId, Boolean(ano && mes));
  const d = consulta.data;
  return (
    <>
      <div className="filtros">
        <label>
          Mês
          <input
            type="month"
            value={mesAno}
            onChange={(e) => e.target.value && setMesAno(e.target.value)}
          />
        </label>
      </div>
      <MensagemErro erro={consulta.error} />
      {d && (
        <>
          <Cards cards={d.cards} />
          <div className="grade-2">
            <div className="cartao">
              <h2 style={{ marginTop: 0 }}>Tempo parado por dia</h2>
              <GraficoBarrasSerie serie={d.serie} medida="tempo" />
              <p className="texto-suave">
                Dias em vermelho tiveram parada acima do limite de alerta.
              </p>
            </div>
            <div className="cartao">
              <h2 style={{ marginTop: 0 }}>% da jornada por dia</h2>
              <GraficoLinhaSerie serie={d.serie} medida="percentual" />
            </div>
          </div>
          <div className="cartao">
            <TabelaSerie serie={d.serie} agrupamento="dia" />
          </div>
        </>
      )}
    </>
  );
}

function RecortePeriodo({ motoristaId }: { motoristaId: string }) {
  const [inicio, setInicio] = useState(somarDias(hoje(), -29));
  const [fim, setFim] = useState(hoje());
  const consulta = useDashboardPeriodo(inicio, fim, motoristaId, Boolean(inicio && fim));
  const d = consulta.data;
  return (
    <>
      <div className="filtros">
        <label>
          De
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
        <label>
          Até
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </label>
        <div className="acoes">
          {[7, 30, 90, 365].map((dias) => (
            <button
              key={dias}
              type="button"
              className="botao botao-pequeno"
              onClick={() => {
                setFim(hoje());
                setInicio(somarDias(hoje(), -(dias - 1)));
              }}
            >
              {dias === 365 ? '12 meses' : `${dias} dias`}
            </button>
          ))}
        </div>
      </div>
      <MensagemErro erro={consulta.error} />
      {d && (
        <>
          <Cards cards={d.cards} />
          <div className="grade-2">
            <div className="cartao">
              <h2 style={{ marginTop: 0 }}>
                Tempo parado por {d.agrupamento === 'mes' ? 'mês' : 'dia'}
              </h2>
              <GraficoLinhaSerie serie={d.serie} medida="tempo" agrupamento={d.agrupamento} />
            </div>
            <div className="cartao">
              <h2 style={{ marginTop: 0 }}>Endereços com maior tempo parado médio</h2>
              {d.ranking.length === 0 ? (
                <Vazio />
              ) : (
                <ol className="lista-simples">
                  {d.ranking.map((r, i) => (
                    <li key={r.pontoId}>
                      <strong>
                        {i + 1}. {r.endereco}
                      </strong>
                      <div className="parada-detalhe">
                        média {formatarDuracao(r.tempoMedioMin)} · {r.visitas} paradas · total{' '}
                        {formatarDuracao(r.tempoTotalMin)} · última em{' '}
                        {formatarDataHora(r.ultimaVisitaEm)}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
          <div className="cartao">
            <TabelaSerie serie={d.serie} agrupamento={d.agrupamento} />
          </div>
        </>
      )}
    </>
  );
}

const ABAS: { id: Recorte; rotulo: string }[] = [
  { id: 'dia', rotulo: 'Dia' },
  { id: 'mes', rotulo: 'Mês' },
  { id: 'periodo', rotulo: 'Período' },
];

/** Dashboard (UC13): recortes Dia, Mês e Período com filtro de motorista. */
export default function Dashboard() {
  const [recorte, setRecorte] = useState<Recorte>('dia');
  const [motoristaId, setMotoristaId] = useState('');
  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Dashboard</h1>
        <div style={{ minWidth: '14rem' }}>
          <FiltroMotorista valor={motoristaId} aoMudar={setMotoristaId} />
        </div>
      </div>
      <div className="abas" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            className="aba"
            aria-selected={recorte === a.id}
            onClick={() => setRecorte(a.id)}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      {recorte === 'dia' && <RecorteDia motoristaId={motoristaId} />}
      {recorte === 'mes' && <RecorteMes motoristaId={motoristaId} />}
      {recorte === 'periodo' && <RecortePeriodo motoristaId={motoristaId} />}
    </section>
  );
}
