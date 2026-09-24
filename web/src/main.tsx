import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';

function App() {
  return (
    <main className="container">
      <h1>Tempo Parado</h1>
      <p>Monitoramento de tempo parado em roteiros.</p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
