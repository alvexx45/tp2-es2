/** Único ponto de acesso HTTP do front-end (Seção 3.1). Injeta o token e padroniza os erros. */

const CHAVE_TOKEN = 'tempo-parado.token';

let tokenAtual: string | null = lerTokenSalvo();
let aoExpirar: (() => void) | null = null;

function lerTokenSalvo(): string | null {
  try {
    return sessionStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

/** Token em memória + sessionStorage (Seção 7). */
export function definirToken(token: string | null) {
  tokenAtual = token;
  try {
    if (token) sessionStorage.setItem(CHAVE_TOKEN, token);
    else sessionStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // sessionStorage indisponível (modo privado): fica só em memória
  }
}

export function obterToken() {
  return tokenAtual;
}

export function aoSessaoExpirar(callback: () => void) {
  aoExpirar = callback;
}

export class ErroApi extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly detalhes: Record<string, unknown>;

  constructor(
    status: number,
    codigo: string,
    mensagem: string,
    detalhes: Record<string, unknown> = {},
  ) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

type Consulta = Record<string, string | number | boolean | null | undefined>;

export function montarQuery(consulta?: Consulta): string {
  if (!consulta) return '';
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(consulta)) {
    if (valor !== undefined && valor !== null && valor !== '') params.set(chave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

async function requisicao(
  metodo: string,
  caminho: string,
  opcoes: { body?: unknown; query?: Consulta } = {},
) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opcoes.body !== undefined) headers['Content-Type'] = 'application/json';
  if (tokenAtual) headers.Authorization = `Bearer ${tokenAtual}`;

  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}${montarQuery(opcoes.query)}`, {
      method: metodo,
      headers,
      body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
    });
  } catch {
    throw new ErroApi(0, 'SEM_CONEXAO', 'Sem conexão com o servidor. Verifique sua internet.');
  }

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    const erro = corpo?.erro;
    if (resposta.status === 401 && tokenAtual && caminho !== '/auth/login') aoExpirar?.();
    throw new ErroApi(
      resposta.status,
      erro?.codigo ?? 'ERRO_HTTP',
      erro?.mensagem ?? `Erro ${resposta.status}`,
      erro?.detalhes ?? {},
    );
  }
  return resposta;
}

export const api = {
  get: async <T>(caminho: string, query?: Consulta) =>
    (await requisicao('GET', caminho, { query })).json() as Promise<T>,
  post: async <T>(caminho: string, body?: unknown) =>
    (await requisicao('POST', caminho, { body: body ?? {} })).json() as Promise<T>,
  put: async <T>(caminho: string, body: unknown) =>
    (await requisicao('PUT', caminho, { body })).json() as Promise<T>,
  patch: async <T>(caminho: string, body: unknown) =>
    (await requisicao('PATCH', caminho, { body })).json() as Promise<T>,
  delete: async <T>(caminho: string) => (await requisicao('DELETE', caminho)).json() as Promise<T>,
  /** Baixa um arquivo autenticado (ex.: CSV) como Blob. */
  arquivo: async (caminho: string, query?: Consulta) =>
    (await requisicao('GET', caminho, { query })).blob(),
};
