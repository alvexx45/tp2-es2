/** Dados do exemplo resolvido (Seção 6.6) e do seed (Seção 12). */
export const COORDS_SEED = [
  { latitude: -19.9165, longitude: -43.9245 }, // P1 Base Sagrada Família
  { latitude: -19.9362, longitude: -43.946 }, // P2 Rua Peru, 55
  { latitude: -19.9551, longitude: -43.9583 }, // P3 Rua X, 5
  { latitude: -19.9724, longitude: -43.9409 }, // P4 Av. João César
];

export const PARAMETROS_EXEMPLO = {
  valorCombustivelLitro: 6,
  kmPorLitroPadrao: 12,
  custoOperacionalPorKm: 0.2,
  fatorCorrecaoRota: 1.3,
  jornadaPadraoHoras: 8,
  tempoMinimoParadaMin: 0,
  limiteAlertaParadaMin: 60,
};

const h = (hhmm: string) => new Date(`2026-09-23T${hhmm}:00-03:00`);

/** Monta as paradas de um roteiro com partida às 08:00 e deslocamentos fixos entre paradas. */
export function paradasComTempos(temposMin: number[]) {
  const paradas = [
    { ordem: 1, chegadaEm: null as Date | null, saidaEm: h('08:00') as Date | null },
  ];
  let cursor = h('08:00').getTime();
  temposMin.forEach((tempo, i) => {
    const chegada = new Date(cursor + 20 * 60000);
    const saida = new Date(chegada.getTime() + tempo * 60000);
    paradas.push({ ordem: i + 2, chegadaEm: chegada, saidaEm: saida });
    cursor = saida.getTime();
  });
  return paradas;
}

export const hora = h;
