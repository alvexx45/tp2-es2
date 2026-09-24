import { ErroApi } from '../api/cliente.ts';

/** Mostra a mensagem de erro da API (ou genérica), com a lista de campos inválidos quando houver. */
export function MensagemErro({ erro }: { erro: unknown }) {
  if (!erro) return null;
  const mensagem = erro instanceof Error ? erro.message : 'Ocorreu um erro.';
  const campos =
    erro instanceof ErroApi && Array.isArray(erro.detalhes.campos)
      ? (erro.detalhes.campos as { campo: string; mensagem: string }[])
      : [];
  return (
    <div className="alerta-erro" role="alert">
      {mensagem}
      {campos.length > 0 && (
        <ul>
          {campos.map((c) => (
            <li key={c.campo}>
              {c.campo}: {c.mensagem}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
