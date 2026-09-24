import { NavLink, Outlet } from 'react-router';
import type { Perfil } from '../api/tipos.ts';
import { useAuth } from '../auth/AuthContext.tsx';

interface ItemMenu {
  para: string;
  rotulo: string;
  icone: string;
  perfis: Perfil[];
}

const MENU: ItemMenu[] = [
  { para: '/motorista', rotulo: 'Hoje', icone: '🚚', perfis: ['MOTORISTA'] },
  { para: '/motorista/historico', rotulo: 'Histórico', icone: '🕘', perfis: ['MOTORISTA'] },
  { para: '/dashboard', rotulo: 'Dashboard', icone: '📊', perfis: ['GERENTE', 'ADMIN'] },
  { para: '/roteiros', rotulo: 'Roteiros', icone: '🗺️', perfis: ['GERENTE', 'ADMIN'] },
  { para: '/historico', rotulo: 'Histórico', icone: '🕘', perfis: ['GERENTE', 'ADMIN'] },
  { para: '/pontos', rotulo: 'Pontos', icone: '📍', perfis: ['GERENTE', 'ADMIN'] },
  { para: '/motoristas', rotulo: 'Motoristas', icone: '🧑‍✈️', perfis: ['GERENTE', 'ADMIN'] },
  { para: '/veiculos', rotulo: 'Veículos', icone: '🛵', perfis: ['GERENTE', 'ADMIN'] },
  { para: '/parametros', rotulo: 'Parâmetros', icone: '⚙️', perfis: ['GERENTE', 'ADMIN'] },
  { para: '/admin/gerentes', rotulo: 'Gerentes', icone: '👔', perfis: ['ADMIN'] },
  { para: '/admin/usuarios', rotulo: 'Usuários', icone: '🔑', perfis: ['ADMIN'] },
  { para: '/admin/auditoria', rotulo: 'Auditoria', icone: '📜', perfis: ['ADMIN'] },
];

/** Menu lateral no desktop e barra inferior no celular (Seção 10). */
export function Layout() {
  const { usuario, sair } = useAuth();
  if (!usuario) return null;
  const itens = MENU.filter((i) => i.perfis.includes(usuario.perfil));

  return (
    <div className="app">
      <header className="topo">
        <span className="marca">⏱️ Tempo Parado</span>
        <span className="topo-usuario">
          <span className="topo-nome">{usuario.nome}</span>
          <button type="button" className="botao botao-link" onClick={sair}>
            Sair
          </button>
        </span>
      </header>
      <nav className="menu" aria-label="Menu principal">
        {itens.map((item) => (
          <NavLink key={item.para} to={item.para} end className="menu-item">
            <span className="menu-icone" aria-hidden="true">
              {item.icone}
            </span>
            <span className="menu-rotulo">{item.rotulo}</span>
          </NavLink>
        ))}
      </nav>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
