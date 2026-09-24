/** Arredonda com meio para cima (half-up) em `casas` decimais, sem erro de ponto flutuante (ex.: 1,005 → 1,01). */
export function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  const escalado = Number((Math.abs(valor) * fator).toPrecision(15));
  return (Math.sign(valor) * Math.round(escalado)) / fator;
}
