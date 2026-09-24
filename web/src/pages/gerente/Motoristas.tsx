import { useState, type FormEvent } from 'react';
import {
  gerentesApi,
  motoristasApi,
  useAnonimizarMotorista,
  veiculosApi,
} from '../../api/cadastros.ts';
import type { Motorista } from '../../api/tipos.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Modal } from '../../components/Modal.tsx';
import { Paginacao } from '../../components/Paginacao.tsx';

function FormMotorista({ motorista, aoSalvar }: { motorista?: Motorista; aoSalvar: () => void }) {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.perfil === 'ADMIN';
  const salvar = motoristasApi.useSalvar();
  const veiculos = veiculosApi.useListar({ ativo: true, tamanho: 200 });
  const gerentes = gerentesApi.useListar({ ativo: true, tamanho: 200 }, ehAdmin);

  const [nome, setNome] = useState(motorista?.nome ?? '');
  const [telefone, setTelefone] = useState(motorista?.telefone ?? '');
  const [documento, setDocumento] = useState(motorista?.documento ?? '');
  const [veiculoId, setVeiculoId] = useState(motorista?.veiculo?.id ?? '');
  const [gerenteId, setGerenteId] = useState(motorista?.gerente.id ?? '');
  const [email, setEmail] = useState(motorista?.email ?? '');
  const [senha, setSenha] = useState('');
  const [ativo, setAtivo] = useState(motorista?.ativo ?? true);

  function enviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate(
      {
        id: motorista?.id,
        dados: {
          nome,
          telefone: telefone || null,
          documento: documento || null,
          veiculoId: veiculoId || null,
          gerenteId: ehAdmin && gerenteId ? gerenteId : undefined,
          email: email || undefined,
          ...(motorista ? { ativo } : { senha }),
        },
      },
      { onSuccess: aoSalvar },
    );
  }

  return (
    <form className="formulario duas-colunas" onSubmit={enviar}>
      <label className="largura-total">
        Nome *
        <input value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} />
      </label>
      <label>
        Telefone
        <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      </label>
      <label>
        Documento (CPF)
        <input value={documento} onChange={(e) => setDocumento(e.target.value)} />
      </label>
      <label>
        Veículo
        <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
          <option value="">— sem veículo —</option>
          {veiculos.data?.itens.map((v) => (
            <option key={v.id} value={v.id}>
              {v.placa} · {v.modelo}
            </option>
          ))}
        </select>
      </label>
      {ehAdmin && (
        <label>
          Gerente responsável *
          <select value={gerenteId} onChange={(e) => setGerenteId(e.target.value)} required>
            <option value="">— selecione —</option>
            {gerentes.data?.itens.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        E-mail de acesso *
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      {!motorista && (
        <label>
          Senha inicial *
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={6}
          />
        </label>
      )}
      {motorista && (
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

/** Carrega o detalhe (documento completo) antes de abrir o formulário de edição. */
function EditarMotorista({ id, aoSalvar }: { id: string; aoSalvar: () => void }) {
  const detalhe = motoristasApi.useObter(id);
  if (detalhe.isLoading) return <p className="carregando">Carregando…</p>;
  if (detalhe.error) return <MensagemErro erro={detalhe.error} />;
  return detalhe.data ? <FormMotorista motorista={detalhe.data} aoSalvar={aoSalvar} /> : null;
}

export default function Motoristas() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.perfil === 'ADMIN';
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<string | 'novo' | null>(null);
  const lista = motoristasApi.useListar({ busca, pagina });
  const inativar = motoristasApi.useInativar();
  const anonimizar = useAnonimizarMotorista();

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Motoristas</h1>
        <button type="button" className="botao botao-primario" onClick={() => setEditando('novo')}>
          + Novo motorista
        </button>
      </div>
      <div className="filtros">
        <label>
          Buscar por nome
          <input
            type="search"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
        </label>
      </div>
      <MensagemErro erro={lista.error ?? inativar.error ?? anonimizar.error} />
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Documento</th>
              <th>Telefone</th>
              <th>Veículo</th>
              {ehAdmin && <th>Gerente</th>}
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.data?.itens.map((m) => (
              <tr key={m.id}>
                <td>{m.nome}</td>
                <td>{m.documento ?? '—'}</td>
                <td>{m.telefone ?? '—'}</td>
                <td>{m.veiculo ? `${m.veiculo.placa} · ${m.veiculo.modelo}` : '—'}</td>
                {ehAdmin && <td>{m.gerente.nome}</td>}
                <td>
                  {m.anonimizado ? (
                    <span className="selo selo-inativo">Anonimizado</span>
                  ) : m.ativo ? (
                    <span className="selo">Ativo</span>
                  ) : (
                    <span className="selo selo-inativo">Inativo</span>
                  )}
                </td>
                <td className="acoes">
                  {!m.anonimizado && (
                    <button
                      type="button"
                      className="botao botao-pequeno"
                      onClick={() => setEditando(m.id)}
                    >
                      Editar
                    </button>
                  )}
                  {m.ativo && (
                    <button
                      type="button"
                      className="botao botao-pequeno botao-perigo"
                      onClick={() =>
                        window.confirm(`Inativar ${m.nome}? O acesso dele será bloqueado.`) &&
                        inativar.mutate(m.id)
                      }
                    >
                      Inativar
                    </button>
                  )}
                  {ehAdmin && !m.anonimizado && (
                    <button
                      type="button"
                      className="botao botao-pequeno botao-perigo"
                      onClick={() =>
                        window.confirm(
                          `Anonimizar ${m.nome}? Nome, telefone, documento e e-mail serão apagados definitivamente (LGPD). Os roteiros continuam nas estatísticas.`,
                        ) && anonimizar.mutate(m.id)
                      }
                    >
                      Anonimizar
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
          titulo={editando === 'novo' ? 'Novo motorista' : 'Editar motorista'}
          aoFechar={() => setEditando(null)}
        >
          {editando === 'novo' ? (
            <FormMotorista aoSalvar={() => setEditando(null)} />
          ) : (
            <EditarMotorista id={editando} aoSalvar={() => setEditando(null)} />
          )}
        </Modal>
      )}
    </section>
  );
}
