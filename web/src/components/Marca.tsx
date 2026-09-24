import { Timer } from 'lucide-react';

/** Logotipo do Tauko: símbolo + nome. */
export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <span className={`marca ${grande ? 'marca-grande' : ''}`}>
      <span className="marca-simbolo" aria-hidden="true">
        <Timer size={grande ? 22 : 18} strokeWidth={2.4} />
      </span>
      Tauko
    </span>
  );
}
