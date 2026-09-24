import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import type { Perfil } from './api/tipos.ts';
import { useAuth } from './auth/AuthContext.tsx';
import { RotaProtegida } from './auth/RotaProtegida.tsx';
import { rotaInicial } from './auth/rotas.ts';
import { Layout } from './components/Layout.tsx';
import Auditoria from './pages/admin/Auditoria.tsx';
import Gerentes from './pages/admin/Gerentes.tsx';
import Usuarios from './pages/admin/Usuarios.tsx';
import HistoricoPage from './pages/gerente/HistoricoPage.tsx';
import Motoristas from './pages/gerente/Motoristas.tsx';
import ParametrosPage from './pages/gerente/ParametrosPage.tsx';
import Pontos from './pages/gerente/Pontos.tsx';
import RoteiroDetalhe from './pages/gerente/RoteiroDetalhe.tsx';
import Roteiros from './pages/gerente/Roteiros.tsx';
import Veiculos from './pages/gerente/Veiculos.tsx';
import Login from './pages/Login.tsx';
import HistoricoMotorista from './pages/motorista/Historico.tsx';
import Hoje from './pages/motorista/Hoje.tsx';

function Inicio() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <p className="carregando">Carregando…</p>;
  return <Navigate to={usuario ? rotaInicial(usuario.perfil) : '/login'} replace />;
}

// O dashboard carrega o Recharts: fica num chunk separado, baixado só quando a tela é aberta.
const Dashboard = lazy(() => import('./pages/gerente/Dashboard.tsx'));

const MOTORISTA: Perfil[] = ['MOTORISTA'];
const GESTAO: Perfil[] = ['GERENTE', 'ADMIN'];
const ADMIN: Perfil[] = ['ADMIN'];

/** Rotas da Seção 10 com o perfil exigido em cada uma. */
const ROTAS: { caminho: string; perfis: Perfil[]; tela: ReactNode }[] = [
  { caminho: '/motorista', perfis: MOTORISTA, tela: <Hoje /> },
  {
    caminho: '/motorista/historico',
    perfis: MOTORISTA,
    tela: <HistoricoMotorista />,
  },
  {
    caminho: '/dashboard',
    perfis: GESTAO,
    tela: (
      <Suspense fallback={<p className="carregando">Carregando…</p>}>
        <Dashboard />
      </Suspense>
    ),
  },
  { caminho: '/historico', perfis: GESTAO, tela: <HistoricoPage /> },
  { caminho: '/roteiros', perfis: GESTAO, tela: <Roteiros /> },
  { caminho: '/roteiros/:id', perfis: GESTAO, tela: <RoteiroDetalhe /> },
  { caminho: '/pontos', perfis: GESTAO, tela: <Pontos /> },
  { caminho: '/motoristas', perfis: GESTAO, tela: <Motoristas /> },
  { caminho: '/veiculos', perfis: GESTAO, tela: <Veiculos /> },
  { caminho: '/parametros', perfis: GESTAO, tela: <ParametrosPage /> },
  { caminho: '/admin/gerentes', perfis: ADMIN, tela: <Gerentes /> },
  { caminho: '/admin/usuarios', perfis: ADMIN, tela: <Usuarios /> },
  { caminho: '/admin/auditoria', perfis: ADMIN, tela: <Auditoria /> },
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RotaProtegida>
            <Layout />
          </RotaProtegida>
        }
      >
        <Route path="/" element={<Inicio />} />
        {ROTAS.map((r) => (
          <Route
            key={r.caminho}
            path={r.caminho}
            element={<RotaProtegida perfis={r.perfis}>{r.tela}</RotaProtegida>}
          />
        ))}
      </Route>
      <Route path="*" element={<Inicio />} />
    </Routes>
  );
}
