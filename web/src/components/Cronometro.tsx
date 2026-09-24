import { useEffect, useState } from 'react';

function formatar(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dois = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`;
}

/** Tempo decorrido desde `inicio`, atualizado a cada segundo. */
export function Cronometro({ inicio }: { inicio: string }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="cronometro" aria-live="off" aria-label="Tempo parado nesta parada">
      {formatar(agora - new Date(inicio).getTime())}
    </div>
  );
}
