export function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="indicador">
      <div className="indicador-rotulo">{rotulo}</div>
      <div className="indicador-valor">{valor}</div>
    </div>
  );
}
