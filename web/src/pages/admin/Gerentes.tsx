import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { gerentesApi } from '../../api/cadastros.ts';
import type { CargoGestor, Gerente } from '../../api/tipos.ts';
import { MensagemErro } from '../../components/MensagemErro.tsx';
import { Modal } from '../../components/Modal.tsx';
import { Paginacao } from '../../components/Paginacao.tsx';

const CARGOS: Record<CargoGestor, string> = {
  GERENTE: 'Gerente',
  COORDENADOR: 'Coordenador(a)',
  DONO: 'Dono(a)',
};

function FormGerente({ gerente, aoSalvar }: { gerente?: Gerente; aoSalvar: () => void }) {
  const salvar = gerentesApi.useSalvar();
  const [nome, setNome] = useState(gerente?.nome ?? '');
  const [telefone, setTelefone] = useState(gerente?.telefone ?? '');
  const [email, setEmail] = useState(gerente?.email ?? '');
  const [cargo, setCargo] = useState<CargoGestor>(gerente?.cargo ?? 'GERENTE');
  const [senha, setSenha] = useState('');
  const [ativo, setAtivo] = useState(gerente?.ativo ?? true);

  function enviar(e: FormEvent) {
    e.preventDefault();
    salvar.mutate(
      {
        id: gerente?.id,
        dados: { nome, telefone, email, cargo, ...(gerente ? { ativo } : { senha }) },
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
        Telefone *
        <input
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          required
          minLength={8}
        />
      </label>
      <label>
        Cargo *
        <select value={cargo} onChange={(e) => setCargo(e.target.value as CargoGestor)}>
          {Object.entries(CARGOS).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
      <label>
        E-mail (login) *
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      {!gerente && (
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
      {gerente && (
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

export default function Gerentes() {
  const [pagina, setPagina] = useState(1);
  const [editando, setEditando] = useState<Gerente | 'novo' | null>(null);
  const lista = gerentesApi.useListar({ pagina });
  const inativar = gerentesApi.useInativar();

  return (
    <section>
      <div className="cabecalho-pagina">
        <h1>Gerentes e coordenadores</h1>
        <button
          type="button"
          className="botao botao-primario botao-fab"
          onClick={() => setEditando('novo')}
        >
          <Plus size={20} aria-hidden="true" />
          Novo gerente
        </button>
      </div>
      <MensagemErro erro={lista.error ?? inativar.error} />
      <div className="cartao tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Cargo</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th className="numero">Equipe</th>
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.data?.itens.map((g) => (
              <tr key={g.id}>
                <td>{g.nome}</td>
                <td>{CARGOS[g.cargo]}</td>
                <td>{g.email}</td>
                <td>{g.telefone}</td>
                <td className="numero">{g.tamanhoEquipe ?? 0}</td>
                <td>
                  {g.ativo ? (
                    <span className="selo">Ativo</span>
                  ) : (
                    <span className="selo selo-inativo">Inativo</span>
                  )}
                </td>
                <td className="acoes">
                  <button
                    type="button"
                    className="botao botao-pequeno"
                    onClick={() => setEditando(g)}
                  >
                    Editar
                  </button>
                  {g.ativo && (
                    <button
                      type="button"
                      className="botao botao-pequeno botao-perigo"
                      onClick={() =>
                        window.confirm(`Inativar ${g.nome}? O acesso será bloqueado.`) &&
                        inativar.mutate(g.id)
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
          titulo={editando === 'novo' ? 'Novo gerente' : 'Editar gerente'}
          aoFechar={() => setEditando(null)}
        >
          <FormGerente
            gerente={editando === 'novo' ? undefined : editando}
            aoSalvar={() => setEditando(null)}
          />
        </Modal>
      )}
    </section>
  );
}
