import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { veiculosApi } from '../../api/cadastros.ts';
import type { TipoVeiculo, Veiculo } from '../../api/tipos.ts';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Modal } from '../../components/Modal.tsx';
import { Paginacao } from '../../components/Paginacao.tsx';
import { formatarNumero } from '../../lib/formatos.ts';

const TIPOS: Record<TipoVeiculo, string> = {
  MOTO: 'Moto',
  CARRO: 'Carro',
  VAN: 'Van',
  CAMINHAO: 'Caminhão',
};

function FormVeiculo({ veiculo, aoSalvar }: { veiculo?: Veiculo; aoSalvar: () => void }) {
  const salvar = veiculosApi.useSalvar();
  const [placa, setPlaca] = useState(veiculo?.placa ?? '');
  const [modelo, setModelo] = useState(veiculo?.modelo ?? '');
  const [tipo, setTipo] = useState<TipoVeiculo>(veiculo?.tipo ?? 'CARRO');
  const [kmPorLitro, setKmPorLitro] = useState(veiculo ? String(veiculo.kmPorLitro) : '');
  const [ativo, setAtivo] = useState(veiculo?.ativo ?? true);

  function enviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate(
      {
        id: veiculo?.id,
        dados: { placa, modelo, tipo, kmPorLitro: Number(kmPorLitro.replace(',', '.')), ativo },
      },
      { onSuccess: aoSalvar },
    );
  }

  return (
    <form className="formulario duas-colunas" onSubmit={enviar}>
      <label>
        Placa *
        <input value={placa} onChange={(e) => setPlaca(e.target.value)} required />
      </label>
      <label>
        Modelo *
        <input value={modelo} onChange={(e) => setModelo(e.target.value)} required />
      </label>
      <label>
        Tipo *
        <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoVeiculo)}>
          {Object.entries(TIPOS).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
      <label>
        Rendimento (km/L) *
        <input
          inputMode="decimal"
          value={kmPorLitro}
          onChange={(e) => setKmPorLitro(e.target.value)}
          required
        />
      </label>
      {veiculo && (
        <label className="checkbox largura-total">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />{' '}
          Ativo
        </label>
      )}
      <div className="largura-total">
        <MensagemErro erro={salvar.error} />
      </div>
      <div className="largura-total acoes">
        <button type="submit" className="botao botao-primario" disabled={salvar.isPending}>
          Salvar
        </button>
      </div>
    </form>
  );
}

export default function Veiculos() {
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<Veiculo | 'novo' | null>(null);
  const lista = veiculosApi.useListar({ pagina });
  const inativar = veiculosApi.useInativar();

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Veículos</h1>
        <button
          type="button"
          className="botao botao-primario botao-fab"
          onClick={() => setEditando('novo')}
        >
          <Plus size={20} aria-hidden="true" />
          Novo veículo
        </button>
      </div>
      <MensagemErro erro={lista.error ?? inativar.error} />
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Placa</th>
              <th>Modelo</th>
              <th>Tipo</th>
              <th className="numero">km/L</th>
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.data?.itens.map((v) => (
              <tr key={v.id}>
                <td>{v.placa}</td>
                <td>{v.modelo}</td>
                <td>{TIPOS[v.tipo]}</td>
                <td className="numero">{formatarNumero(v.kmPorLitro)}</td>
                <td>
                  {v.ativo ? (
                    <span className="selo">Ativo</span>
                  ) : (
                    <span className="selo selo-inativo">Inativo</span>
                  )}
                </td>
                <td className="acoes">
                  <button
                    type="button"
                    className="botao botao-pequeno"
                    onClick={() => setEditando(v)}
                  >
                    Editar
                  </button>
                  {v.ativo && (
                    <button
                      type="button"
                      className="botao botao-pequeno botao-perigo"
                      onClick={() =>
                        window.confirm(`Inativar o veículo ${v.placa}?`) && inativar.mutate(v.id)
                      }
                    >
                      Inativar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Paginacao dados={lista.data} aoMudar={setPagina} />
      </div>
      {editando && (
        <Modal
          titulo={editando === 'novo' ? 'Novo veículo' : 'Editar veículo'}
          aoFechar={() => setEditando(null)}
        >
          <FormVeiculo
            veiculo={editando === 'novo' ? undefined : editando}
            aoSalvar={() => setEditando(null)}
          />
        </Modal>
      )}
    </section>
  );
}
