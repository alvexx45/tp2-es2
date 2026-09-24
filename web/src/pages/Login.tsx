import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ErroApi } from '../api/cliente.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { rotaInicial } from '../auth/rotas.ts';
import { Marca } from '../components/Marca.tsx';

export default function Login() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={rotaInicial(usuario.perfil)} replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const u = await entrar(email, senha);
      const destino = (local.state as { de?: string } | null)?.de;
      navegar(destino && destino !== '/login' ? destino : rotaInicial(u.perfil), { replace: true });
    } catch (err) {
      setErro(err instanceof ErroApi ? err.message : 'Não foi possível entrar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <aside className="login-painel" aria-hidden="true">
        <Marca grande />
        <div>
          <p className="login-painel-titulo">Cada minuto parado, visível.</p>
          <p className="login-painel-texto">
            Registre chegadas e saídas pelo celular e acompanhe tempo parado, distância e custo de
            cada roteiro em tempo real.
          </p>
        </div>
      </aside>
      <form className="login-cartao" onSubmit={enviar}>
        <div className="login-marca-movel">
          <Marca grande />
        </div>
        <div>
          <h1>Entrar</h1>
          <p className="texto-suave">Monitoramento de tempo parado em roteiros</p>
        </div>
        <label>
          E-mail
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>
        {erro && (
          <p className="alerta-erro" role="alert">
            {erro}
          </p>
        )}
        <button type="submit" className="botao botao-primario botao-grande" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
