import { motoristasApi } from '../api/cadastros.ts';

export function FiltroMotorista({
  valor,
  aoMudar,
}: {
  valor: string;
  aoMudar: (id: string) => void;
}) {
  const motoristas = motoristasApi.useListar({ tamanho: 200 });
  return (
    <label>
      Motorista
      <select value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">Todos</option>
        {motoristas.data?.itens.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
