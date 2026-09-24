import { arredondar } from './numeros.ts';

export interface ParametrosCusto {
  valorCombustivelLitro: number;
  kmPorLitroPadrao: number;
  custoOperacionalPorKm: number;
}

/** RN07/RF11: custo por km = combustível por km + custo operacional por km. */
export function calcularCustoPorKm(
  parametros: ParametrosCusto,
  kmPorLitroVeiculo?: number | null,
): number {
  const kmPorLitro = kmPorLitroVeiculo ?? parametros.kmPorLitroPadrao;
  return parametros.valorCombustivelLitro / kmPorLitro + parametros.custoOperacionalPorKm;
}

/** RN07/RF11: custo estimado do roteiro (2 casas). */
export function calcularCusto(
  distanciaTotalKm: number,
  parametros: ParametrosCusto,
  kmPorLitroVeiculo?: number | null,
): { custoPorKm: number; custoEstimado: number } {
  const custoPorKm = calcularCustoPorKm(parametros, kmPorLitroVeiculo);
  return {
    custoPorKm: arredondar(custoPorKm, 2),
    custoEstimado: arredondar(distanciaTotalKm * custoPorKm, 2),
  };
}
