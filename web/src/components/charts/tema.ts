/** Cores e tipografia dos gráficos (paleta de referência validada; série única + status crítico). */
export const TEMA = {
  serie: '#4f46e5',
  critico: '#dc2626',
  grade: '#eef0f4',
  eixo: '#cbd5e1',
  textoEixo: '#64748b',
  fonte: 12,
};

export const eixo = {
  stroke: TEMA.eixo,
  tick: { fill: TEMA.textoEixo, fontSize: TEMA.fonte },
  tickLine: false,
};
