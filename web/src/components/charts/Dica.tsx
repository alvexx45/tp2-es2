import type { ReactNode } from 'react';

/** Caixa de tooltip dos gráficos: valor em destaque, contexto (endereço, data/hora) abaixo. */
export function Dica({
  titulo,
  valor,
  linhas,
}: {
  titulo: string;
  valor: ReactNode;
  linhas: ReactNode[];
}) {
  return (
    <div className="dica-grafico">
      <div className="dica-valor">{valor}</div>
      <div className="dica-titulo">{titulo}</div>
      {linhas.map((l, i) => (
        <div key={i} className="dica-linha">
          {l}
        </div>
      ))}
    </div>
  );
}
