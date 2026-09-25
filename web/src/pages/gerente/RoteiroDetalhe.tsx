import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import {
  useCancelarRoteiro,
  useCorrigirHorario,
  useFinalizarRoteiro,
  useRoteiro,
} from '../../api/roteiros.ts';
import type { Parada, Roteiro } from '../../api/tipos.ts';
import { FormRoteiro } from '../../components/FormRoteiro.tsx';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Modal } from '../../components/Modal.tsx';
import { ResumoRoteiro } from '../../components/ResumoRoteiro.tsx';
import { SeloAlerta, SeloStatus } from '../../components/StatusRoteiro.tsx';
import {
  deInputDataHora,
  formatarData,
  formatarDataHora,
  formatarDuracao,
  paraInputDataHora,
} from '../../lib/formatos.ts';

/** Correção de horários pelo gerente/admin, com confirmação e auditoria (RF05, RNF05). */
function CorrigirHorario({
  roteiro,
  parada,
  aoConcluir,
}: {
  roteiro: Roteiro;
  parada: Parada;
  aoConcluir: () => void;
}) {
  const corrigir = useCorrigirHorario();
  const [chegada, setChegada] = useState(paraInputDataHora(parada.chegadaEm));
  const [saida, setSaida] = useState(paraInputDataHora(parada.saidaEm));
  const partida = parada.ordem === 1;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const aviso =
      roteiro.status === 'FINALIZADO'
        ? 'O roteiro já foi finalizado: tempo parado, % da jornada e custo serão recalculados com os parâmetros usados na finalização.'
        : 'Os totais do roteiro serão recalculados.';
    if (
      !window.confirm(`Confirmar a correção? A alteração fica registrada na auditoria.\n\n${aviso}`)
    )
      return;
    corrigir.mutate(
      {
        roteiroId: roteiro.id,
        paradaId: parada.id,
        ...(partida ? {} : { chegadaEm: deInputDataHora(chegada) }),
        saidaEm: deInputDataHora(saida),
      },
      { onSuccess: aoConcluir },
    );
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <p className="texto-suave">
        Parada {parada.ordem} · {parada.ponto.endereco}
      </p>
      {!partida && (
        <label>
          Chegada
          <input
            type="datetime-local"
            value={chegada}
            onChange={(e) => setChegada(e.target.value)}
          />
        </label>
      )}
      <label>
        {partida ? 'Saída (horário de partida)' : 'Saída'}
        <input type="datetime-local" value={saida} onChange={(e) => setSaida(e.target.value)} />
      </label>
      <MensagemErro erro={corrigir.error} />
      <div className="acoes">
        <button type="submit" className="botao botao-primario" disabled={corrigir.isPending}>
          Salvar correção
        </button>
      </div>
    </form>
  );
}

function Finalizar({ roteiro, aoConcluir }: { roteiro: Roteiro; aoConcluir: () => void }) {
  const finalizar = useFinalizarRoteiro();
  const [km, setKm] = useState('');
  return (
    <form
      className="formulario"
      onSubmit={(e) => {
        e.preventDefault();
        finalizar.mutate(
          { roteiroId: roteiro.id, kmInformado: km ? Number(km.replace(',', '.')) : null },
          { onSuccess: aoConcluir },
        );
      }}
    >
      <label>
        Km percorrido (odômetro, opcional)
        <input
          inputMode="decimal"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder="Ex.: 12,5"
        />
      </label>
      <p className="texto-suave">
        Sem km informado, a distância é estimada pelas coordenadas dos pontos.
      </p>
      <MensagemErro erro={finalizar.error} />
      <button type="submit" className="botao botao-sucesso" disabled={finalizar.isPending}>
        Finalizar roteiro
      </button>
    </form>
  );
}

export default function RoteiroDetalhe() {
  const { id } = useParams();
  const consulta = useRoteiro(id);
  const cancelar = useCancelarRoteiro();
  const [corrigindo, setCorrigindo] = useState<Parada | null>(null);
  const [editando, setEditando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  if (consulta.isLoading) return <p className="carregando">Carregando…</p>;
  if (consulta.error || !consulta.data)
    return <MensagemErro erro={consulta.error ?? new Error('Roteiro não encontrado.')} />;
  const r = consulta.data;

  return (
    <section>
      {/* No celular a AppBar já mostra a seta de voltar. */}
      <p className="so-desktop">
        <Link to="/roteiros">‹ Roteiros</Link>
      </p>
      <div className="cabecalho-pagina">
        <h1 className="titulo-visivel">
          {r.motorista.nome} · {formatarData(r.data)}
        </h1>
        <SeloStatus status={r.status} />
      </div>
      <p className="texto-suave">
        Veículo: {r.veiculo ? `${r.veiculo.placa} · ${r.veiculo.modelo}` : 'não informado'} ·
        Gerente: {r.gerente.nome}
        {r.kmInformado !== null && ` · Km informado: ${r.kmInformado}`}
      </p>
      <ResumoRoteiro roteiro={r} />

      <div className="acoes" style={{ marginBottom: '1rem' }}>
        {r.status === 'PLANEJADO' && (
          <>
            <button type="button" className="botao" onClick={() => setEditando(true)}>
              Editar pontos
            </button>
            <button
              type="button"
              className="botao botao-perigo"
              onClick={() => window.confirm('Cancelar este roteiro?') && cancelar.mutate(r.id)}
            >
              Cancelar roteiro
            </button>
          </>
        )}
        {r.status === 'EM_ANDAMENTO' && (
          <button
            type="button"
            className="botao botao-sucesso"
            onClick={() => setFinalizando(true)}
          >
            Finalizar roteiro
          </button>
        )}
      </div>
      <MensagemErro erro={cancelar.error} />

      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Endereço</th>
              <th>Pedido</th>
              <th>Chegada</th>
              <th>Saída</th>
              <th className="numero">Tempo parado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {r.paradas.map((p) => (
              <tr key={p.id} className={p.alerta ? 'linha-alerta' : undefined}>
                <td>{p.ordem}</td>
                <td>
                  {p.ponto.endereco}
                  {p.ordem === 1 && <span className="texto-suave"> (partida)</span>}
                </td>
                <td>{p.codigoPedido ?? '—'}</td>
                <td>{p.ordem === 1 ? '—' : formatarDataHora(p.chegadaEm)}</td>
                <td>{formatarDataHora(p.saidaEm)}</td>
                <td className="numero">
                  {p.ordem === 1 ? '—' : formatarDuracao(p.tempoParadoMin)}{' '}
                  {p.alerta && <SeloAlerta />}
                </td>
                <td>
                  {r.status !== 'CANCELADO' && (
                    <button
                      type="button"
                      className="botao botao-pequeno"
                      onClick={() => setCorrigindo(p)}
                    >
                      Corrigir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="texto-suave">
        Paradas acima de {formatarDuracao(r.limiteAlertaParadaMin)} ficam destacadas.
      </p>

      {corrigindo && (
        <Modal titulo="Corrigir horário" aoFechar={() => setCorrigindo(null)}>
          <CorrigirHorario roteiro={r} parada={corrigindo} aoConcluir={() => setCorrigindo(null)} />
        </Modal>
      )}
      {editando && (
        <Modal titulo="Editar roteiro" aoFechar={() => setEditando(false)}>
          <FormRoteiro roteiro={r} aoSalvar={() => setEditando(false)} />
        </Modal>
      )}
      {finalizando && (
        <Modal titulo="Finalizar roteiro" aoFechar={() => setFinalizando(false)}>
          <Finalizar roteiro={r} aoConcluir={() => setFinalizando(false)} />
        </Modal>
      )}
    </section>
  );
}
