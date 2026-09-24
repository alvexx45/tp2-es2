import { useState } from 'react';
import { pontosApi } from '../../api/cadastros.ts';
import type { Ponto } from '../../api/tipos.ts';
import { FormPonto } from '../../components/FormPonto.tsx';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Modal } from '../../components/Modal.tsx';
import { Paginacao } from '../../components/Paginacao.tsx';

export default function Pontos() {
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [editando, setEditando] = useState<Ponto | 'novo' | null>(null);
  const lista = pontosApi.useListar({ busca, pagina, ativo: mostrarInativos ? undefined : true });
  const inativar = pontosApi.useInativar();

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Pontos</h1>
        <button type="button" className="botao botao-primario" onClick={() => setEditando('novo')}>
          + Novo ponto
        </button>
      </div>
      <div className="filtros">
        <label>
          Buscar por endereço ou descrição
          <input
            type="search"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
          />
          Mostrar inativos
        </label>
      </div>
      <MensagemErro erro={lista.error ?? inativar.error} />
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Endereço</th>
              <th>Descrição</th>
              <th className="numero">Latitude</th>
              <th className="numero">Longitude</th>
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.data?.itens.map((p) => (
              <tr key={p.id}>
                <td>{p.endereco}</td>
                <td>{p.descricao ?? '—'}</td>
                <td className="numero">{p.latitude}</td>
                <td className="numero">{p.longitude}</td>
                <td>
                  {p.ativo ? (
                    <span className="selo">Ativo</span>
                  ) : (
                    <span className="selo selo-inativo">Inativo</span>
                  )}
                </td>
                <td className="acoes">
                  <button
                    type="button"
                    className="botao botao-pequeno"
                    onClick={() => setEditando(p)}
                  >
                    Editar
                  </button>
                  {p.ativo && (
                    <button
                      type="button"
                      className="botao botao-pequeno botao-perigo"
                      onClick={() =>
                        window.confirm(`Inativar o ponto "${p.endereco}"?`) && inativar.mutate(p.id)
                      }
                    >
                      Inativar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {lista.data?.itens.length === 0 && (
              <tr>
                <td colSpan={6} className="texto-suave">
                  Nenhum ponto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Paginacao dados={lista.data} aoMudar={setPagina} />
      </div>
      {editando && (
        <Modal
          titulo={editando === 'novo' ? 'Novo ponto' : 'Editar ponto'}
          aoFechar={() => setEditando(null)}
        >
          <FormPonto
            ponto={editando === 'novo' ? undefined : editando}
            aoSalvar={() => setEditando(null)}
          />
        </Modal>
      )}
    </section>
  );
}
