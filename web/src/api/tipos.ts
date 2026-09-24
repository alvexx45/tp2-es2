export type Perfil = 'MOTORISTA' | 'GERENTE' | 'ADMIN';

export interface UsuarioLogado {
  id: string;
  email: string;
  perfil: Perfil;
  nome: string;
  motoristaId: string | null;
  gerenteId: string | null;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
}
