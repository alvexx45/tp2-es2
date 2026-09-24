import { useState } from 'react';
import { Link } from 'react-router';
import { baixarCsv, useHistorico } from '../../api/historico.ts';
import { FiltroMotorista } from '../../components/FiltroMotorista.tsx';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Paginacao } from '../../components/Paginacao.tsx';
import { SeloAlerta } from '../../components/StatusRoteiro.tsx';
import { somarDias } from '../../lib/datas.ts';
import { formatarData, formatarDataHora, formatarDuracao, hoje } from '../../lib/formatos.ts';

/** Histórico de paradas filtrável (UC12) com exportação CSV (UC14). */
export default function HistoricoPage() {
  const [inicio, setInicio] = useState(somarDias(hoje(), -7));
  const [fim, setFim] = useState(hoje());
  const [motoristaId, setMotoristaId] = useState('');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [exportando, setExportando] = useState(false);
  const [erroExportacao, setErroExportacao] = useState<unknown>(null);
  const filtros = { inicio, fim, motoristaId, busca };
  const lista = useHistorico({ ...filtros, pagina, tamanho: 50 });

  async function exportar() {
    setErroExportacao(null);
    setExportando(true);
    try {
      await baixarCsv(filtros);
    } catch (e) {
      setErroExportacao(e);
    } finally {
      setExportando(false);
    }
  }

  const mudar = (fn: () => void) => {
    fn();
    setPagina(1);
  };

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Histórico de paradas</h1>
        <button type="button" className="botao" onClick={exportar} disabled={exportando}>
          ⬇️ {exportando ? 'Gerando…' : 'Exportar CSV'}
        </button>
      </div>
      <div className="filtros">
        <label>
          De
          <input
            type="date"
            value={inicio}
            onChange={(e) => mudar(() => setInicio(e.target.value))}
          />
        </label>
        <label>
          Até
          <input type="date" value={fim} onChange={(e) => mudar(() => setFim(e.target.value))} />
        </label>
        <FiltroMotorista valor={motoristaId} aoMudar={(id) => mudar(() => setMotoristaId(id))} />
        <label>
          Endereço ou pedido
          <input
            type="search"
            value={busca}
            onChange={(e) => mudar(() => setBusca(e.target.value))}
          />
        </label>
      </div>
      <MensagemErro erro={lista.error ?? erroExportacao} />
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Motorista</th>
              <th>#</th>
              <th>Endereço</th>
              <th>Pedido</th>
              <th>Chegada</th>
              <th>Saída</th>
              <th className="numero">Tempo parado</th>
            </tr>
          </thead>
          <tbody>
            {lista.data?.itens.map((i) => (
              <tr key={i.paradaId} className={i.alerta ? 'linha-alerta' : undefined}>
                <td>
                  <Link to={`/roteiros/${i.roteiroId}`}>{formatarData(i.data)}</Link>
                </td>
                <td>{i.motorista}</td>
                <td>{i.ordem}</td>
                <td>{i.endereco}</td>
                <td>{i.codigoPedido ?? '—'}</td>
                <td>{formatarDataHora(i.chegadaEm)}</td>
                <td>{formatarDataHora(i.saidaEm)}</td>
                <td className="numero">
                  {formatarDuracao(i.tempoParadoMin)} {i.alerta && <SeloAlerta />}
                </td>
              </tr>
            ))}
            {lista.data?.itens.length === 0 && (
              <tr>
                <td colSpan={8} className="texto-suave">
                  Nenhuma parada registrada no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Paginacao dados={lista.data} aoMudar={setPagina} />
      </div>
    </section>
  );
}
