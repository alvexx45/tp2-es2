import { useState, type FormEvent } from 'react';
import { useAtualizarUsuario, usuariosApi } from '../../api/cadastros.ts';
import type { Perfil, Usuario } from '../../api/tipos.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Modal } from '../../components/Modal.tsx';
import { Paginacao } from '../../components/Paginacao.tsx';

const PERFIS: Record<Perfil, string> = {
  MOTORISTA: 'Motorista',
  GERENTE: 'Gerente',
  ADMIN: 'Administrador',
};

/** Perfis que o usuário pode assumir, conforme o cadastro vinculado. */
function perfisPermitidos(u: Usuario): Perfil[] {
  if (u.vinculo === 'MOTORISTA') return ['MOTORISTA'];
  if (u.vinculo === 'GERENTE') return ['GERENTE', 'ADMIN'];
  return ['ADMIN'];
}

function EditarUsuario({ usuario, aoSalvar }: { usuario: Usuario; aoSalvar: () => void }) {
  const atualizar = useAtualizarUsuario();
  const [perfil, setPerfil] = useState<Perfil>(usuario.perfil);
  const [ativo, setAtivo] = useState(usuario.ativo);
  const [senha, setSenha] = useState('');

  function enviar(e: FormEvent) {
    e.preventDefault();
    atualizar.mutate(
      { id: usuario.id, dados: { perfil, ativo, ...(senha && { senha }) } },
      { onSuccess: aoSalvar },
    );
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <p className="texto-suave">{usuario.email}</p>
      <label>
        Perfil
        <select value={perfil} onChange={(e) => setPerfil(e.target.value as Perfil)}>
          {perfisPermitidos(usuario).map((p) => (
            <option key={p} value={p}>
              {PERFIS[p]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nova senha (deixe em branco para manter)
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={6}
          autoComplete="new-password"
        />
      </label>
      <label className="checkbox">
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo
      </label>
      <MensagemErro erro={atualizar.error} />
      <button type="submit" className="botao botao-primario" disabled={atualizar.isPending}>
        Salvar
      </button>
    </form>
  );
}

function NovoAdmin({ aoSalvar }: { aoSalvar: () => void }) {
  const salvar = usuariosApi.useSalvar();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  return (
    <form
      className="formulario"
      onSubmit={(e) => {
        e.preventDefault();
        salvar.mutate(
          { dados: { email, senha, perfil: 'ADMIN' } as Partial<Usuario> },
          { onSuccess: aoSalvar },
        );
      }}
    >
      <p className="texto-suave">Gerentes e motoristas ganham usuário no próprio cadastro.</p>
      <label>
        E-mail *
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
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
      <MensagemErro erro={salvar.error} />
      <button type="submit" className="botao botao-primario" disabled={salvar.isPending}>
        Criar administrador
      </button>
    </form>
  );
}

/** Usuários e perfis (UC17). */
export default function Usuarios() {
  const { usuario: logado } = useAuth();
  const [busca, setBusca] = useState('');
  const [perfil, setPerfil] = useState('');
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<Usuario | 'novo' | null>(null);
  const lista = usuariosApi.useListar({ busca, perfil, pagina });

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Usuários e perfis</h1>
        <button type="button" className="botao botao-primario" onClick={() => setEditando('novo')}>
          + Novo administrador
        </button>
      </div>
      <div className="filtros">
        <label>
          Buscar por e-mail
          <input
            type="search"
            value={busca}
            onChange={(e) => (setBusca(e.target.value), setPagina(1))}
          />
        </label>
        <label>
          Perfil
          <select value={perfil} onChange={(e) => (setPerfil(e.target.value), setPagina(1))}>
            <option value="">Todos</option>
            {Object.entries(PERFIS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>
      <MensagemErro erro={lista.error} />
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>E-mail</th>
              <th>Nome</th>
              <th>Perfil</th>
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.data?.itens.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.nome ?? '—'}</td>
                <td>{PERFIS[u.perfil]}</td>
                <td>
                  {u.ativo ? (
                    <span className="selo">Ativo</span>
                  ) : (
                    <span className="selo selo-inativo">Inativo</span>
                  )}
                </td>
                <td>
                  {u.id !== logado?.id && (
                    <button
                      type="button"
                      className="botao botao-pequeno"
                      onClick={() => setEditando(u)}
                    >
                      Editar
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
          titulo={editando === 'novo' ? 'Novo administrador' : 'Editar usuário'}
          aoFechar={() => setEditando(null)}
        >
          {editando === 'novo' ? (
            <NovoAdmin aoSalvar={() => setEditando(null)} />
          ) : (
            <EditarUsuario usuario={editando} aoSalvar={() => setEditando(null)} />
          )}
        </Modal>
      )}
    </section>
  );
}
