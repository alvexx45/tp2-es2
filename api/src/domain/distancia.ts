import { arredondar } from './numeros.ts';

export interface Coordenada {
  latitude: number;
  longitude: number;
}

const RAIO_TERRA_KM = 6371;

const radianos = (graus: number) => (graus * Math.PI) / 180;

/** Distância em linha reta (fórmula de haversine) entre dois pontos, em km. */
export function haversineKm(a: Coordenada, b: Coordenada): number {
  const dLat = radianos(b.latitude - a.latitude);
  const dLon = radianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radianos(a.latitude)) * Math.cos(radianos(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * RN07: distância do roteiro. O km informado pelo motorista tem prioridade; senão soma o haversine
 * entre pontos consecutivos (na ordem do roteiro) × fator de correção de rota. Resultado com 2 casas.
 */
export function calcularDistancia(
  pontosEmOrdem: Coordenada[],
  fatorCorrecaoRota: number,
  kmInformado?: number | null,
): number {
  if (kmInformado !== undefined && kmInformado !== null) return arredondar(kmInformado, 2);
  let linhaReta = 0;
  for (let i = 0; i < pontosEmOrdem.length - 1; i++) {
    linhaReta += haversineKm(pontosEmOrdem[i], pontosEmOrdem[i + 1]);
  }
  return arredondar(linhaReta * fatorCorrecaoRota, 2);
}
