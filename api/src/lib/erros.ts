import { ErroRegra } from '../domain/erros.ts';

export { ErroRegra };

/** Recurso inexistente ou fora do escopo do usuário (Seção 7: não revelar que existe). */
export function naoEncontrado(recurso = 'Recurso'): ErroRegra {
  return new ErroRegra('NAO_ENCONTRADO', `${recurso} não encontrado.`, 404);
}

export function acessoNegado(): ErroRegra {
  return new ErroRegra('ACESSO_NEGADO', 'Seu perfil não tem acesso a este recurso.', 403);
}

export function naoAutenticado(mensagem = 'Faça login para continuar.'): ErroRegra {
  return new ErroRegra('NAO_AUTENTICADO', mensagem, 401);
}

export function conflito(codigo: string, mensagem: string): ErroRegra {
  return new ErroRegra(codigo, mensagem, 409);
}
