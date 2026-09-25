import {
  ArrowLeft,
  Briefcase,
  Car,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Menu,
  ScrollText,
  Settings,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
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

/** Destinos fixos na barra inferior do celular; o restante fica na gaveta (padrão Material 3). */
const MAX_BARRA_INFERIOR = 4;

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return ((partes[0]?.[0] ?? '') + ultima).toUpperCase();
}

/**
 * No celular as tabelas viram cartões: cada célula recebe o título da coluna em `data-label`
 * (lido pelo CSS). Observa o conteúdo porque as linhas chegam depois, com os dados da API.
 */
function useRotulosDeTabela(raiz: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const rotular = () => {
      el.querySelectorAll('table').forEach((tabela) => {
        const titulos = [...tabela.querySelectorAll('thead th')].map(
          (th) => th.textContent?.trim() ?? '',
        );
        tabela.querySelectorAll('tbody tr').forEach((tr) => {
          [...tr.children].forEach((td, i) => {
            const rotulo = td.hasAttribute('colspan') ? '' : (titulos[i] ?? '');
            if (td.getAttribute('data-label') !== rotulo) td.setAttribute('data-label', rotulo);
          });
        });
      });
    };
    rotular();
    const observador = new MutationObserver(rotular);
    observador.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observador.disconnect();
  }, [raiz]);
}

/**
 * Desktop: menu lateral. Celular: AppBar com título da tela, gaveta de navegação e
 * NavigationBar inferior — inspirado no Material 3 padrão do Flutter (Seção 10).
 */
export function Layout() {
  const { usuario, sair } = useAuth();
  const { pathname } = useLocation();
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [rolado, setRolado] = useState(false);
  const conteudo = useRef<HTMLElement>(null);
  useRotulosDeTabela(conteudo);

  useEffect(() => {
    const aoRolar = () => setRolado(window.scrollY > 4);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  useEffect(() => {
    if (!gavetaAberta) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setGavetaAberta(false);
    document.addEventListener('keydown', tecla);
    document.body.classList.add('sem-rolagem');
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.classList.remove('sem-rolagem');
    };
  }, [gavetaAberta]);

  if (!usuario) return null;
  const itens = MENU.filter((i) => i.perfis.includes(usuario.perfil));
  // Tela atual = item com o prefixo mais longo; se não for exato, é uma subtela (ex.: detalhe).
  const atual = itens
    .filter((i) => pathname === i.para || pathname.startsWith(i.para + '/'))
    .sort((a, b) => b.para.length - a.para.length)[0];
  const subtela = atual && atual.para !== pathname;
  const fechar = () => setGavetaAberta(false);

  return (
    <div className="app">
      <header className={`topo ${rolado ? 'topo-rolado' : ''}`}>
        {subtela ? (
          <Link to={atual.para} className="botao botao-icone topo-lider" aria-label="Voltar">
            <ArrowLeft size={22} />
          </Link>
        ) : (
          <button
            type="button"
            className="botao botao-icone topo-lider"
            onClick={() => setGavetaAberta(true)}
            aria-label="Abrir menu"
            aria-expanded={gavetaAberta}
            aria-controls="gaveta"
          >
            <Menu size={22} />
          </button>
        )}
        <span className="topo-marca">
          <Marca />
        </span>
        <span className="topo-titulo">{atual?.rotulo ?? 'Tauko'}</span>
        <span className="topo-usuario">
          <button
            type="button"
            className="avatar topo-avatar-botao"
            onClick={() => setGavetaAberta(true)}
            aria-label="Conta e menu"
          >
            {iniciais(usuario.nome)}
          </button>
          <span className="avatar topo-avatar" aria-hidden="true">
            {iniciais(usuario.nome)}
          </span>
          <span className="topo-identificacao">
            <span className="topo-nome">{usuario.nome}</span>
            <span className="topo-perfil">{PERFIS[usuario.perfil]}</span>
          </span>
          <button
            type="button"
            className="botao botao-icone topo-sair"
            onClick={sair}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </span>
      </header>

      <nav className="menu" aria-label="Menu principal">
        {itens.map(({ para, rotulo, icone: Icone }, i) => (
          <Link
            key={para}
            to={para}
            className={`menu-item ${i >= MAX_BARRA_INFERIOR ? 'menu-extra' : ''} ${atual?.para === para ? 'active' : ''}`}
            aria-current={atual?.para === para ? 'page' : undefined}
          >
            <span className="menu-icone">
              <Icone size={22} aria-hidden="true" />
            </span>
            <span className="menu-rotulo">{rotulo}</span>
          </Link>
        ))}
      </nav>

      <div
        className={`gaveta-fundo ${gavetaAberta ? 'aberta' : ''}`}
        onClick={fechar}
        aria-hidden="true"
      />
      <aside
        id="gaveta"
        className={`gaveta ${gavetaAberta ? 'aberta' : ''}`}
        aria-label="Menu"
        aria-hidden={!gavetaAberta}
        inert={!gavetaAberta}
      >
        <div className="gaveta-cabecalho">
          <Marca />
          <div className="gaveta-conta">
            <span className="avatar avatar-grande" aria-hidden="true">
              {iniciais(usuario.nome)}
            </span>
            <div>
              <div className="gaveta-nome">{usuario.nome}</div>
              <div className="gaveta-perfil">{PERFIS[usuario.perfil]}</div>
            </div>
          </div>
        </div>
        <nav className="gaveta-lista" aria-label="Todas as telas">
          {itens.map(({ para, rotulo, icone: Icone }) => (
            <Link
              key={para}
              to={para}
              className={`gaveta-item ${atual?.para === para ? 'active' : ''}`}
              aria-current={atual?.para === para ? 'page' : undefined}
              onClick={fechar}
            >
              <Icone size={22} aria-hidden="true" />
              {rotulo}
            </Link>
          ))}
        </nav>
        <div className="gaveta-rodape">
          <button type="button" className="gaveta-item" onClick={sair}>
            <LogOut size={22} aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>

      <main ref={conteudo} className="conteudo">
        <div key={pathname} className="transicao-tela">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
