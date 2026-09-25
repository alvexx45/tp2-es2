import { useState } from 'react';
import { useFinalizarRoteiro, useMeuRoteiro, useRegistrarHorario } from '../../api/roteiros.ts';
import type { Parada, Roteiro } from '../../api/tipos.ts';
import { Cronometro } from '../../components/Cronometro.tsx';
import { obterPosicao } from '../../components/geo/geolocalizacao.ts';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Modal } from '../../components/Modal.tsx';
import { ResumoRoteiro } from '../../components/ResumoRoteiro.tsx';
import { SeloAlerta, SeloStatus } from '../../components/StatusRoteiro.tsx';
import { formatarData, formatarDuracao, formatarHora } from '../../lib/formatos.ts';

type Acao = { parada: Parada; tipo: 'chegada' | 'saida' };

/** Próxima ação do motorista: a primeira parada ainda sem o horário esperado. */
function proximaAcao(r: Roteiro): Acao | null {
  for (const p of r.paradas) {
    if (p.ordem === 1) {
      if (!p.saidaEm) return { parada: p, tipo: 'saida' };
      continue;
    }
    if (!p.chegadaEm) return { parada: p, tipo: 'chegada' };
    if (!p.saidaEm) return { parada: p, tipo: 'saida' };
  }
  return null;
}

function FinalizarRoteiro({ roteiro, aoConcluir }: { roteiro: Roteiro; aoConcluir: () => void }) {
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
        Km rodados no dia (opcional)
        <input
          inputMode="decimal"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder="Ex.: 12,5"
        />
      </label>
      <p className="texto-suave">
        Se não souber, deixe em branco: o sistema estima pela localização dos pontos.
      </p>
      <MensagemErro erro={finalizar.error} />
      <button
        type="submit"
        className="botao botao-sucesso botao-grande"
        disabled={finalizar.isPending}
      >
        {finalizar.isPending ? 'Finalizando…' : 'Confirmar finalização'}
      </button>
    </form>
  );
}

export default function Hoje() {
  const consulta = useMeuRoteiro();
  const registrar = useRegistrarHorario();
  const [registrando, setRegistrando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  if (consulta.isLoading) return <p className="carregando">Carregando…</p>;
  if (consulta.error) return <MensagemErro erro={consulta.error} />;
  const r = consulta.data?.roteiro;

  if (!r) {
    return (
      <section>
        <h1 className="titulo-visivel">Roteiro de hoje</h1>
        <div className="cartao">
          <p>Você não tem roteiro para hoje. Fale com o seu gerente se isso estiver errado.</p>
        </div>
      </section>
    );
  }

  const acao = r.status === 'FINALIZADO' || r.status === 'CANCELADO' ? null : proximaAcao(r);

  async function executar(a: Acao) {
    setRegistrando(true);
    // GPS opcional: se negado ou indisponível, registra só o horário.
    const posicao = await obterPosicao(4000);
    registrar.mutate(
      { roteiroId: r!.id, paradaId: a.parada.id, tipo: a.tipo, ...(posicao ?? {}) },
      { onSettled: () => setRegistrando(false) },
    );
  }

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1 className="titulo-visivel">Roteiro de {formatarData(r.data)}</h1>
        <SeloStatus status={r.status} />
      </div>

      {r.status === 'FINALIZADO' ? (
        <>
          <div className="alerta-sucesso" style={{ marginBottom: '1rem' }}>
            ✅ Roteiro finalizado. Bom descanso!
          </div>
          <ResumoRoteiro roteiro={r} />
        </>
      ) : (
        <div className="cartao resumo-motorista">
          <div>
            <div className="indicador-rotulo">Total parado hoje</div>
            <div className="indicador-valor">{formatarDuracao(r.tempoTotalParadoMin)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="indicador-rotulo">Paradas</div>
            <div className="indicador-valor">
              {r.paradas.filter((p) => p.ordem > 1 && p.saidaEm).length}/{r.paradas.length - 1}
            </div>
          </div>
        </div>
      )}

      <MensagemErro erro={registrar.error} />

      <ol className="paradas" style={{ marginTop: '1rem' }}>
        {r.paradas.map((p) => {
          const atual = acao?.parada.id === p.id;
          const concluida = p.ordem === 1 ? Boolean(p.saidaEm) : Boolean(p.chegadaEm && p.saidaEm);
          return (
            <li
              key={p.id}
              className={`parada ${atual ? 'parada-atual' : ''} ${concluida ? 'parada-concluida' : ''}`}
              aria-current={atual ? 'step' : undefined}
            >
              <span className="parada-ordem">{concluida ? '✓' : p.ordem}</span>
              <div>
                <div className="parada-endereco">{p.ponto.endereco}</div>
                <div className="parada-detalhe">
                  {p.ordem === 1 ? 'Partida' : (p.ponto.descricao ?? 'Parada')}
                  {p.codigoPedido && ` · Pedido ${p.codigoPedido}`}
                </div>
                <div className="parada-detalhe">
                  {p.ordem === 1
                    ? p.saidaEm && `Saída ${formatarHora(p.saidaEm)}`
                    : p.chegadaEm &&
                      `Chegada ${formatarHora(p.chegadaEm)}${p.saidaEm ? ` · Saída ${formatarHora(p.saidaEm)} · Parado ${formatarDuracao(p.tempoParadoMin)}` : ''}`}{' '}
                  {p.alerta && <SeloAlerta />}
                </div>
              </div>
              {atual && acao && (
                <div className="parada-acao">
                  {acao.tipo === 'saida' && p.chegadaEm && <Cronometro inicio={p.chegadaEm} />}
                  <button
                    type="button"
                    className={`botao botao-grande ${acao.tipo === 'chegada' ? 'botao-primario' : 'botao-sucesso'}`}
                    disabled={registrando}
                    onClick={() => executar(acao)}
                  >
                    {registrando
                      ? 'Registrando…'
                      : acao.tipo === 'chegada'
                        ? '📍 Cheguei'
                        : p.ordem === 1
                          ? '🚚 Saí da base'
                          : '✅ Saí'}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {r.status === 'EM_ANDAMENTO' && !acao && (
        <div style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="botao botao-sucesso botao-grande"
            onClick={() => setFinalizando(true)}
          >
            🏁 Finalizar roteiro
          </button>
        </div>
      )}

      {finalizando && (
        <Modal titulo="Finalizar roteiro" aoFechar={() => setFinalizando(false)}>
          <FinalizarRoteiro roteiro={r} aoConcluir={() => setFinalizando(false)} />
        </Modal>
      )}
    </section>
  );
}
