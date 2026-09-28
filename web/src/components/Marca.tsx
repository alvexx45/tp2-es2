/** Logotipo do Tauko: ícone SVG + nome em Basique Pro Bold. */
export function Marca({ grande = false }: { grande?: boolean }) {
  const tamanho = grande ? 42 : 32;
  return (
    <span className={`marca ${grande ? 'marca-grande' : ''}`}>
      <img
        src="/tauko.svg"
        alt=""
        aria-hidden="true"
        width={tamanho}
        height={tamanho}
        className="marca-simbolo-img"
      />
      <span className="marca-nome">tauko</span>
    </span>
  );
}
