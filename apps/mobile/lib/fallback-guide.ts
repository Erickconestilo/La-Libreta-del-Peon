import type { GuideEntry } from '@shared/types';

const now = '2026-05-31T00:00:00.000Z';

export const fallbackGuideEntries: GuideEntry[] = [
  {
    body: 'Antes de estacionar, comprueba trípode firme, base nivelada, batería, memoria, prisma y visibilidad al punto. Si hay dudas de estabilidad, no midas: cambia ubicación o refuerza el apoyo.',
    category: 'arranque',
    createdAt: now,
    createdBy: 'local-guide',
    id: 'local-guide-arranque-001',
    title: 'Arranque rápido con estación Leica',
    updatedAt: now,
    updatedBy: null
  },
  {
    body: 'Centra y nivela con calma. Revisa plomada, burbuja electrónica y orientación. Un estacionamiento mal centrado contamina todas las lecturas posteriores aunque el instrumento mida bien.',
    category: 'estacionamiento',
    createdAt: now,
    createdBy: 'local-guide',
    id: 'local-guide-estacionamiento-001',
    title: 'Estacionamiento seguro',
    updatedAt: now,
    updatedBy: null
  },
  {
    body: 'Registra foto general, foto del punto, referencia cercana, acceso y obstáculos. La memoria visual debe permitir que otro topógrafo encuentre el estacionamiento sin llamarte.',
    category: 'memoria visual',
    createdAt: now,
    createdBy: 'local-guide',
    id: 'local-guide-memoria-001',
    title: 'Qué fotos guardar',
    updatedAt: now,
    updatedBy: null
  },
  {
    body: 'Si una lectura sale conflictiva, repite desde la misma posición antes de descartarla. Si la repetición es consistente, conserva la buena y anota por qué se sustituyó la anterior.',
    category: 'medicion',
    createdAt: now,
    createdBy: 'local-guide',
    id: 'local-guide-medicion-001',
    title: 'Lecturas conflictivas',
    updatedAt: now,
    updatedBy: null
  },
  {
    body: 'Antes de cerrar, verifica que estación, notas, fotos y coordenadas han quedado guardadas. Si trabajaste sin conexión, marca qué queda pendiente de sincronizar.',
    category: 'cierre',
    createdAt: now,
    createdBy: 'local-guide',
    id: 'local-guide-cierre-001',
    title: 'Cierre de trabajo en campo',
    updatedAt: now,
    updatedBy: null
  },
  {
    body: 'En el Leica LS10, enciende el equipo y navega con las flechas por la interfaz. Antes de medir, confirma que estás dentro del trabajo correcto y que la fecha/nombre siguen el criterio de obra.',
    category: 'nivel ls10',
    createdAt: now,
    createdBy: 'local-guide',
    id: 'local-guide-ls10-arranque-001',
    title: 'Arranque del Nivel Leica LS10',
    updatedAt: now,
    updatedBy: null
  },
  {
    body: 'Para crear trabajo en LS10 entra en Gestión > Trabajo > Nuevo. Usa formato YY/MM/DD e iniciales del lugar. Guarda con F4 y comprueba que el trabajo aparece antes de registrar lecturas.',
    category: 'nivel ls10',
    createdAt: now,
    createdBy: 'local-guide',
    id: 'local-guide-ls10-trabajo-001',
    title: 'Crear trabajo en LS10',
    updatedAt: now,
    updatedBy: null
  },
  {
    body: 'En nivelación, no confíes solo en que el equipo mida: revisa secuencia, punto, mira y cierre. Si una lectura queda dudosa, anótala y repite antes de abandonar la posición.',
    category: 'nivelacion',
    createdAt: now,
    createdBy: 'local-guide',
    id: 'local-guide-ls10-control-001',
    title: 'Control rápido de nivelación',
    updatedAt: now,
    updatedBy: null
  }
];
