export interface Posicao {
  latitude: number;
  longitude: number;
}

/**
 * Wrapper de `navigator.geolocation` (Seção 3.1). Nunca lança erro: devolve `null` se o navegador
 * não suportar, se a permissão for negada ou se demorar demais (o GPS só funciona em HTTPS ou localhost).
 */
export function obterPosicao(tempoLimiteMs = 8000): Promise<Posicao | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({ latitude: round6(p.coords.latitude), longitude: round6(p.coords.longitude) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: tempoLimiteMs, maximumAge: 30_000 },
    );
  });
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
