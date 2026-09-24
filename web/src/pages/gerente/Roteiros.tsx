import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motoristasApi } from '../../api/cadastros.ts';
import { useRoteiros } from '../../api/roteiros.ts';
import type { StatusRoteiro } from '../../api/tipos.ts';
import { FormRoteiro } from '../../components/FormRoteiro.tsx';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Modal } from '../../components/Modal.tsx';
import { Paginacao } from '../../components/Paginacao.tsx';
import { SeloStatus } from '../../components/StatusRoteiro.tsx';
import {
  formatarData,
  formatarDuracao,
  formatarMoeda,
  formatarNumero,
  hoje,
} from '../../lib/formatos.ts';

export default function Roteiros() {
  const navegar = useNavigate();
  const [data, setData] = useState(hoje());
  const [motoristaId, setMotoristaId] = useState('');
  const [status, setStatus] = useState<StatusRoteiro | ''>('');
  const [pagina, setPagina] = useState(1);
  const [novo, setNovo] = useState(false);
  const motoristas = motoristasApi.useListar({ tamanho: 200 });
  const lista = useRoteiros({ data, motoristaId, status, pagina });

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Roteiros</h1>
        <button type="button" className="botao botao-primario" onClick={() => setNovo(true)}>
          + Novo roteiro
        </button>
      </div>
      <div className="filtros">
        <label>
          Data
          <input
            type="date"
            value={data}
            onChange={(e) => (setData(e.target.value), setPagina(1))}
          />
        </label>
        <label>
          Motorista
          <select
            value={motoristaId}
            onChange={(e) => (setMotoristaId(e.target.value), setPagina(1))}
          >
            <option value="">Todos</option>
            {motoristas.data?.itens.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Situação
          <select
            value={status}
            onChange={(e) => (setStatus(e.target.value as StatusRoteiro | ''), setPagina(1))}
          >
            <option value="">Todas</option>
            <option value="PLANEJADO">Planejado</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="FINALIZADO">Finalizado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </label>
      </div>
      <MensagemErro erro={lista.error} />
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Motorista</th>
              <th>Veículo</th>
              <th>Situação</th>
              <th className="numero">Paradas</th>
              <th className="numero">Tempo parado</th>
              <th className="numero">% jornada</th>
              <th className="numero">Custo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.data?.itens.map((r) => (
              <tr key={r.id}>
                <td>{formatarData(r.data)}</td>
                <td>{r.motorista.nome}</td>
                <td>{r.veiculo?.placa ?? '—'}</td>
                <td>
                  <SeloStatus status={r.status} />
                </td>
                <td className="numero">
                  {r.paradasConcluidas}/{r.totalParadas}
                </td>
                <td className="numero">{formatarDuracao(r.tempoTotalParadoMin)}</td>
                <td className="numero">{formatarNumero(r.percentualJornada, ' %')}</td>
                <td className="numero">{formatarMoeda(r.custoEstimado)}</td>
                <td>
                  <Link to={`/roteiros/${r.id}`} className="botao botao-pequeno">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {lista.data?.itens.length === 0 && (
              <tr>
                <td colSpan={9} className="texto-suave">
                  Nenhum roteiro para os filtros escolhidos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Paginacao dados={lista.data} aoMudar={setPagina} />
      </div>
      {novo && (
        <Modal titulo="Novo roteiro" aoFechar={() => setNovo(false)}>
          <FormRoteiro aoSalvar={(r) => navegar(`/roteiros/${r.id}`)} />
        </Modal>
      )}
    </section>
  );
}
