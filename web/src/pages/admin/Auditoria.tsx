import { useState } from 'react';
import { useAuditoria } from '../../api/auditoria.ts';
import type { LogAuditoria } from '../../api/tipos.ts';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Paginacao } from '../../components/Paginacao.tsx';
import { somarDias } from '../../lib/datas.ts';
import { formatarDataHora, hoje } from '../../lib/formatos.ts';

const ENTIDADES = [
  'Roteiro',
  'PontoRoteiro',
  'Ponto',
  'Motorista',
  'Gerente',
  'Usuario',
  'Veiculo',
  'ParametroSistema',
];
const ACOES = { CRIACAO: 'Criação', ALTERACAO: 'Alteração', EXCLUSAO: 'Exclusão' };

/** Mostra só os campos que mudaram (ou todos, na criação). */
function Diferencas({ log }: { log: LogAuditoria }) {
  const antes = (log.valorAnterior ?? {}) as Record<string, unknown>;
  const depois = (log.valorNovo ?? {}) as Record<string, unknown>;
  const chaves = [...new Set([...Object.keys(antes), ...Object.keys(depois)])].filter(
    (k) => JSON.stringify(antes[k]) !== JSON.stringify(depois[k]),
  );
  const texto = (v: unknown) =>
    v === undefined || v === null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (chaves.length === 0) return <span className="texto-suave">sem diferenças</span>;
  return (
    <ul className="lista-simples" style={{ fontSize: '0.82rem' }}>
      {chaves.map((k) => (
        <li key={k} style={{ padding: '0.15rem 0', wordBreak: 'break-word' }}>
          <strong>{k}</strong>: {log.acao !== 'CRIACAO' && <>{texto(antes[k])} → </>}
          {texto(depois[k])}
        </li>
      ))}
    </ul>
  );
}

/** Consulta de logs de auditoria (UC18). */
export default function Auditoria() {
  const [entidade, setEntidade] = useState('');
  const [entidadeId, setEntidadeId] = useState('');
  const [inicio, setInicio] = useState(somarDias(hoje(), -7));
  const [fim, setFim] = useState(hoje());
  const [pagina, setPagina] = useState(1);
  const idValido = /^[0-9a-f-]{36}$/i.test(entidadeId.trim());
  const lista = useAuditoria({
    entidade,
    entidadeId: idValido ? entidadeId.trim() : '',
    inicio,
    fim,
    pagina,
    tamanho: 30,
  });
  const mudar = (fn: () => void) => (fn(), setPagina(1));

  return (
    <section>
      <h1>Auditoria</h1>
      <div className="filtros">
        <label>
          Entidade
          <select value={entidade} onChange={(e) => mudar(() => setEntidade(e.target.value))}>
            <option value="">Todas</option>
            {ENTIDADES.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label>
          Id do registro
          <input
            value={entidadeId}
            onChange={(e) => mudar(() => setEntidadeId(e.target.value))}
            placeholder="UUID (opcional)"
          />
        </label>
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
      </div>
      <MensagemErro erro={lista.error} />
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Data/hora</th>
              <th>Usuário</th>
              <th>Entidade</th>
              <th>Ação</th>
              <th>Alterações</th>
            </tr>
          </thead>
          <tbody>
            {lista.data?.itens.map((l) => (
              <tr key={l.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatarDataHora(l.dataHora)}</td>
                <td>{l.usuario.email}</td>
                <td>
                  {l.entidade}
                  <div className="texto-suave" style={{ fontSize: '0.75rem' }}>
                    {l.entidadeId.slice(0, 8)}
                  </div>
                </td>
                <td>{ACOES[l.acao]}</td>
                <td style={{ minWidth: '16rem' }}>
                  <Diferencas log={l} />
                </td>
              </tr>
            ))}
            {lista.data?.itens.length === 0 && (
              <tr>
                <td colSpan={5} className="texto-suave">
                  Nenhum registro no período.
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
