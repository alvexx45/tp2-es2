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

export type TipoVeiculo = 'MOTO' | 'CARRO' | 'VAN' | 'CAMINHAO';
export type CargoGestor = 'GERENTE' | 'COORDENADOR' | 'DONO';

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  tipo: TipoVeiculo;
  kmPorLitro: number;
  ativo: boolean;
}

export interface Ponto {
  id: string;
  descricao: string | null;
  endereco: string;
  latitude: number;
  longitude: number;
  ativo: boolean;
}

export interface Gerente {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cargo: CargoGestor;
  ativo: boolean;
  tamanhoEquipe?: number;
}

export interface Motorista {
  id: string;
  nome: string;
  telefone: string | null;
  documento: string | null;
  ativo: boolean;
  anonimizado: boolean;
  email: string | null;
  gerente: { id: string; nome: string };
  veiculo: Pick<Veiculo, 'id' | 'placa' | 'modelo' | 'tipo' | 'kmPorLitro'> | null;
}

export interface Usuario {
  id: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: string;
  nome: string | null;
  vinculo: 'MOTORISTA' | 'GERENTE' | null;
}
