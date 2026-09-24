import { useState, type FormEvent } from 'react';
import { motoristasApi, pontosApi, veiculosApi } from '../api/cadastros.ts';
import { useSalvarRoteiro } from '../api/roteiros.ts';
import type { Ponto, Roteiro } from '../api/tipos.ts';
import { hoje } from '../lib/formatos.ts';
import { FormPonto } from './FormPonto.tsx';
import { MensagemErro } from './MensagemErro.tsx';
import { Modal } from './Modal.tsx';

interface ItemParada {
  chave: number;
  ponto: Pick<Ponto, 'id' | 'endereco' | 'descricao'>;
  codigoPedido: string;
}

let proximaChave = 1;

/** Montagem do roteiro (UC06): data, motorista, veículo e paradas ordenadas com ↑/↓. */
export function FormRoteiro({
  roteiro,
  aoSalvar,
}: {
  roteiro?: Roteiro;
  aoSalvar: (r: Roteiro) => void;
}) {
  const salvar = useSalvarRoteiro();
  const motoristas = motoristasApi.useListar({ ativo: true, tamanho: 200 });
  const veiculos = veiculosApi.useListar({ ativo: true, tamanho: 200 });

  const [data, setData] = useState(roteiro?.data ?? hoje());
  const [motoristaId, setMotoristaId] = useState(roteiro?.motorista.id ?? '');
  const [veiculoId, setVeiculoId] = useState(roteiro?.veiculo?.id ?? '');
  const [paradas, setParadas] = useState<ItemParada[]>(
    () =>
      roteiro?.paradas.map((p) => ({
        chave: proximaChave++,
        ponto: p.ponto,
        codigoPedido: p.codigoPedido ?? '',
      })) ?? [],
  );
  const [busca, setBusca] = useState('');
  const [novoPonto, setNovoPonto] = useState(false);
  const resultados = pontosApi.useListar(
    { busca, ativo: true, tamanho: 8 },
    busca.trim().length >= 2,
  );

  function adicionar(ponto: ItemParada['ponto']) {
    setParadas((atual) => [...atual, { chave: proximaChave++, ponto, codigoPedido: '' }]);
    setBusca('');
  }

  function mover(indice: number, delta: -1 | 1) {
    setParadas((atual) => {
      const nova = [...atual];
      const destino = indice + delta;
      if (destino < 0 || destino >= nova.length) return atual;
      [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
      return nova;
    });
  }

  function escolherMotorista(id: string) {
    setMotoristaId(id);
    // Veículo padrão = veículo do motorista (pode ser trocado).
    const m = motoristas.data?.itens.find((x) => x.id === id);
    setVeiculoId(m?.veiculo?.id ?? '');
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate(
      {
        id: roteiro?.id,
        dados: {
          data,
          motoristaId,
          veiculoId: veiculoId || null,
          paradas: paradas.map((p, i) => ({
            pontoId: p.ponto.id,
            ordem: i + 1,
            codigoPedido: p.codigoPedido || null,
          })),
        },
      },
      { onSuccess: aoSalvar },
    );
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <div className="formulario duas-colunas">
        <label>
          Data *
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </label>
        <label>
          Motorista *
          <select value={motoristaId} onChange={(e) => escolherMotorista(e.target.value)} required>
            <option value="">— selecione —</option>
            {motoristas.data?.itens.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="largura-total">
          Veículo
          <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
            <option value="">— sem veículo (usa km/L padrão) —</option>
            {veiculos.data?.itens.map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa} · {v.modelo} ({v.kmPorLitro} km/L)
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2>Paradas</h2>
      {paradas.length === 0 && (
        <p className="texto-suave">
          Adicione o ponto de partida e depois as paradas, na ordem do trajeto.
        </p>
      )}
      <ol className="paradas">
        {paradas.map((p, i) => (
          <li key={p.chave} className="parada">
            <span className="parada-ordem">{i + 1}</span>
            <div>
              <div className="parada-endereco">{p.ponto.endereco}</div>
              <div className="parada-detalhe">
                {i === 0 ? 'Partida' : (p.ponto.descricao ?? 'Parada')}
              </div>
              <div className="acoes" style={{ marginTop: '0.4rem' }}>
                {i > 0 && (
                  <input
                    aria-label="Código do pedido"
                    placeholder="Código do pedido"
                    value={p.codigoPedido}
                    style={{ maxWidth: '12rem' }}
                    onChange={(e) =>
                      setParadas((atual) =>
                        atual.map((x) =>
                          x.chave === p.chave ? { ...x, codigoPedido: e.target.value } : x,
                        ),
                      )
                    }
                  />
                )}
                <button
                  type="button"
                  className="botao botao-pequeno"
                  onClick={() => mover(i, -1)}
                  disabled={i === 0}
                  aria-label="Subir"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="botao botao-pequeno"
                  onClick={() => mover(i, 1)}
                  disabled={i === paradas.length - 1}
                  aria-label="Descer"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="botao botao-pequeno botao-perigo"
                  onClick={() => setParadas((atual) => atual.filter((x) => x.chave !== p.chave))}
                  aria-label="Remover"
                >
                  ✕
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="cartao">
        <label>
          Adicionar ponto (busque por endereço ou descrição)
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex.: Rua Peru"
          />
        </label>
        {busca.trim().length >= 2 && (
          <ul className="lista-simples">
            {resultados.data?.itens.map((p) => (
              <li key={p.id} className="acoes" style={{ justifyContent: 'space-between' }}>
                <span>
                  {p.endereco} {p.descricao && <span className="texto-suave">· {p.descricao}</span>}
                </span>
                <button type="button" className="botao botao-pequeno" onClick={() => adicionar(p)}>
                  Adicionar
                </button>
              </li>
            ))}
            {resultados.data?.itens.length === 0 && (
              <li className="texto-suave">Nenhum ponto encontrado.</li>
            )}
          </ul>
        )}
        <button type="button" className="botao botao-link" onClick={() => setNovoPonto(true)}>
          + Cadastrar novo ponto
        </button>
      </div>

      <MensagemErro erro={salvar.error} />
      <div className="acoes">
        <button
          type="submit"
          className="botao botao-primario"
          disabled={salvar.isPending || paradas.length < 2}
        >
          {salvar.isPending ? 'Salvando…' : 'Salvar roteiro'}
        </button>
        {paradas.length < 2 && <span className="texto-suave">Mínimo: partida + 1 parada.</span>}
      </div>

      {novoPonto && (
        <Modal titulo="Novo ponto" aoFechar={() => setNovoPonto(false)}>
          <FormPonto
            aoSalvar={(p) => {
              adicionar(p);
              setNovoPonto(false);
            }}
          />
        </Modal>
      )}
    </form>
  );
}
