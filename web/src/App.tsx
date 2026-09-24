import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth/AuthContext.tsx';
import { RotaProtegida } from './auth/RotaProtegida.tsx';
import { rotaInicial } from './auth/rotas.ts';
import { Layout } from './components/Layout.tsx';
import Login from './pages/Login.tsx';

function Inicio() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <p className="carregando">Carregando…</p>;
  return <Navigate to={usuario ? rotaInicial(usuario.perfil) : '/login'} replace />;
}

function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <section>
      <h1>{titulo}</h1>
      <p className="texto-suave">Tela em construção.</p>
    </section>
  );
}

const GESTAO = ['GERENTE', 'ADMIN'] as const;

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
        <Route
          path="/motorista"
          element={
            <RotaProtegida perfis={['MOTORISTA']}>
              <EmConstrucao titulo="Roteiro de hoje" />
            </RotaProtegida>
          }
        />
        <Route
          path="/motorista/historico"
          element={
            <RotaProtegida perfis={['MOTORISTA']}>
              <EmConstrucao titulo="Meus roteiros" />
            </RotaProtegida>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RotaProtegida perfis={[...GESTAO]}>
              <EmConstrucao titulo="Dashboard" />
            </RotaProtegida>
          }
        />
      </Route>
      <Route path="*" element={<Inicio />} />
    </Routes>
  );
}
