/** Cores e tipografia dos gráficos — paleta Tauko (verde escuro + âmbar). */
export const TEMA = {
  serie: '#0F6E56',
  destaque: '#FAC775',
  critico: '#dc2626',
  grade: '#e4efec',
  eixo: '#b8d0cb',
  textoEixo: '#4a6b63',
  fonte: 12,
};

export const eixo = {
  stroke: TEMA.eixo,
  tick: { fill: TEMA.textoEixo, fontSize: TEMA.fonte },
  tickLine: false,
};
