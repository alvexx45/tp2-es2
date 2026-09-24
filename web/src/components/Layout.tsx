import {
  Briefcase,
  Car,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  ScrollText,
  Settings,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router';
import type { Perfil } from '../api/tipos.ts';
import { useAuth } from '../auth/AuthContext.tsx';
import { Marca } from './Marca.tsx';

interface ItemMenu {
  para: string;
  rotulo: string;
  icone: LucideIcon;
  perfis: Perfil[];
}

const MENU: ItemMenu[] = [
  { para: '/motorista', rotulo: 'Hoje', icone: Truck, perfis: ['MOTORISTA'] },
  { para: '/motorista/historico', rotulo: 'Histórico', icone: History, perfis: ['MOTORISTA'] },
  { para: '/dashboard', rotulo: 'Dashboard', icone: LayoutDashboard, perfis: ['GERENTE', 'ADMIN'] },
  { para: '/roteiros', rotulo: 'Roteiros', icone: Map, perfis: ['GERENTE', 'ADMIN'] },
  { para: '/historico', rotulo: 'Histórico', icone: History, perfis: ['GERENTE', 'ADMIN'] },
  { para: '/pontos', rotulo: 'Pontos', icone: MapPin, perfis: ['GERENTE', 'ADMIN'] },
  { para: '/motoristas', rotulo: 'Motoristas', icone: Users, perfis: ['GERENTE', 'ADMIN'] },
  { para: '/veiculos', rotulo: 'Veículos', icone: Car, perfis: ['GERENTE', 'ADMIN'] },
  { para: '/parametros', rotulo: 'Parâmetros', icone: Settings, perfis: ['GERENTE', 'ADMIN'] },
  { para: '/admin/gerentes', rotulo: 'Gerentes', icone: Briefcase, perfis: ['ADMIN'] },
  { para: '/admin/usuarios', rotulo: 'Usuários', icone: KeyRound, perfis: ['ADMIN'] },
  { para: '/admin/auditoria', rotulo: 'Auditoria', icone: ScrollText, perfis: ['ADMIN'] },
];

const PERFIS: Record<Perfil, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  MOTORISTA: 'Motorista',
};

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return ((partes[0]?.[0] ?? '') + ultima).toUpperCase();
}

/** Menu lateral no desktop e barra inferior no celular (Seção 10). */
export function Layout() {
  const { usuario, sair } = useAuth();
  if (!usuario) return null;
  const itens = MENU.filter((i) => i.perfis.includes(usuario.perfil));

  return (
    <div className="app">
      <header className="topo">
        <Marca />
        <span className="topo-usuario">
          <span className="avatar" aria-hidden="true">
            {iniciais(usuario.nome)}
          </span>
          <span className="topo-identificacao">
            <span className="topo-nome">{usuario.nome}</span>
            <span className="topo-perfil">{PERFIS[usuario.perfil]}</span>
          </span>
          <button
            type="button"
            className="botao botao-icone"
            onClick={sair}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </span>
      </header>
      <nav className="menu" aria-label="Menu principal">
        {itens.map(({ para, rotulo, icone: Icone }) => (
          <NavLink key={para} to={para} end className="menu-item">
            <Icone className="menu-icone" size={20} aria-hidden="true" />
            <span className="menu-rotulo">{rotulo}</span>
          </NavLink>
        ))}
      </nav>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
