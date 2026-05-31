export type GuideManual = {
  accent: 'green' | 'amber';
  id: string;
  pages: number;
  summary: string;
  tag: string;
  title: string;
};

export const guideManuals: GuideManual[] = [
  {
    accent: 'green',
    id: 'leica-station',
    pages: 22,
    summary:
      'Uso de estación Leica de peón a topógrafo: encendido, estacionamiento, trabajo, orientación y control básico en campo.',
    tag: 'Estación total',
    title: 'Guía Leica de estación'
  },
  {
    accent: 'amber',
    id: 'leica-ls10',
    pages: 28,
    summary:
      'Nivel Leica LS10: crear trabajo, navegar por la interfaz, registrar lecturas y cerrar una nivelación sin perder datos.',
    tag: 'Nivel digital',
    title: 'Nivel Leica LS10'
  }
];
