/** Violação de regra de negócio. O errorHandler converte em `{ erro: { codigo, mensagem, detalhes } }`. */
export class ErroRegra extends Error {
  readonly codigo: string;
  readonly status: number;
  readonly detalhes: Record<string, unknown>;

  constructor(
    codigo: string,
    mensagem: string,
    status = 422,
    detalhes: Record<string, unknown> = {},
  ) {
    super(mensagem);
    this.name = 'ErroRegra';
    this.codigo = codigo;
    this.status = status;
    this.detalhes = detalhes;
  }
}
