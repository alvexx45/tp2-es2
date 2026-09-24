/** Cores e tipografia dos gráficos (paleta de referência validada; série única + status crítico). */
export const TEMA = {
  serie: '#2a78d6',
  critico: '#d03b3b',
  grade: '#e1e0d9',
  eixo: '#c3c2b7',
  textoEixo: '#898781',
  fonte: 12,
};

export const eixo = {
  stroke: TEMA.eixo,
  tick: { fill: TEMA.textoEixo, fontSize: TEMA.fonte },
  tickLine: false,
};
