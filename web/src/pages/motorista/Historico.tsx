import { useState } from 'react';
import { useMeusRoteiros, useRoteiro } from '../../api/roteiros.ts';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Paginacao } from '../../components/Paginacao.tsx';
import { ResumoRoteiro } from '../../components/ResumoRoteiro.tsx';
import { SeloAlerta, SeloStatus } from '../../components/StatusRoteiro.tsx';
import { formatarData, formatarDuracao, formatarHora, hoje } from '../../lib/formatos.ts';

function somarDias(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function DetalheRoteiro({ id }: { id: string }) {
  const consulta = useRoteiro(id);
  if (consulta.isLoading) return <p className="carregando">Carregando…</p>;
  if (!consulta.data) return <MensagemErro erro={consulta.error} />;
  const r = consulta.data;
  return (
    <div style={{ marginTop: '0.75rem' }}>
      <ResumoRoteiro roteiro={r} />
      <ul className="lista-simples">
        {r.paradas
          .filter((p) => p.ordem > 1)
          .map((p) => (
            <li key={p.id}>
              <strong>
                {p.ordem - 1}. {p.ponto.endereco}
              </strong>
              <div className="parada-detalhe">
                {formatarHora(p.chegadaEm)} – {formatarHora(p.saidaEm)} ·{' '}
                {formatarDuracao(p.tempoParadoMin)} {p.alerta && <SeloAlerta />}
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}

/** Meus roteiros anteriores (UC11). */
export default function Historico() {
  const [inicio, setInicio] = useState(somarDias(hoje(), -30));
  const [fim, setFim] = useState(hoje());
  const [pagina, setPagina] = useState(1);
  const [aberto, setAberto] = useState<string | null>(null);
  const lista = useMeusRoteiros({ inicio, fim, pagina, tamanho: 20 });

  return (
    <section>
      <h1>Meus roteiros</h1>
      <div className="filtros">
        <label>
          De
          <input
            type="date"
            value={inicio}
            onChange={(e) => (setInicio(e.target.value), setPagina(1))}
          />
        </label>
        <label>
          Até
          <input type="date" value={fim} onChange={(e) => (setFim(e.target.value), setPagina(1))} />
        </label>
      </div>
      <MensagemErro erro={lista.error} />
      {lista.data && 'itens' in lista.data && (
        <>
          {lista.data.itens.length === 0 && (
            <p className="texto-suave">Nenhum roteiro no período.</p>
          )}
          {lista.data.itens.map((r) => (
            <div key={r.id} className="cartao">
              <button
                type="button"
                className="botao-link"
                style={{ width: '100%', textAlign: 'left', padding: 0 }}
                onClick={() => setAberto(aberto === r.id ? null : r.id)}
                aria-expanded={aberto === r.id}
              >
                <div className="cabecalho-pagina" style={{ marginBottom: 0 }}>
                  <strong>{formatarData(r.data)}</strong>
                  <SeloStatus status={r.status} />
                </div>
                <div className="texto-suave">
                  {r.totalParadas} paradas · parado {formatarDuracao(r.tempoTotalParadoMin)}
                </div>
              </button>
              {aberto === r.id && <DetalheRoteiro id={r.id} />}
            </div>
          ))}
          <Paginacao dados={lista.data} aoMudar={setPagina} />
        </>
      )}
    </section>
  );
}
