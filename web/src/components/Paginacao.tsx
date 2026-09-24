import type { Pagina } from '../api/tipos.ts';

export function Paginacao({
  dados,
  aoMudar,
}: {
  dados?: Pagina<unknown>;
  aoMudar: (pagina: number) => void;
}) {
  if (!dados || dados.total <= dados.tamanho) return null;
  const paginas = Math.ceil(dados.total / dados.tamanho);
  return (
    <div className="paginacao">
      <span className="texto-suave">
        {dados.total} registros · página {dados.pagina} de {paginas}
      </span>
      <button
        type="button"
        className="botao botao-pequeno"
        disabled={dados.pagina <= 1}
        onClick={() => aoMudar(dados.pagina - 1)}
      >
        ‹ Anterior
      </button>
      <button
        type="button"
        className="botao botao-pequeno"
        disabled={dados.pagina >= paginas}
        onClick={() => aoMudar(dados.pagina + 1)}
      >
        Próxima ›
      </button>
    </div>
  );
}
