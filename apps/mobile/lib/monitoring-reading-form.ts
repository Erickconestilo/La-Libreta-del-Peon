import type { InstrumentType } from '@shared/types';

export type ReadingCaptureCopy = {
  photoCaption: string;
  photoLabel: string;
  protocolNote: string | null;
  protocolStatus: 'confirmed' | 'provisional';
  showsUnit: boolean;
};

export const getReadingCaptureCopy = (instrumentType: InstrumentType): ReadingCaptureCopy => {
  if (instrumentType === 'fissure_witness') {
    return {
      photoCaption: 'La foto y la fecha son la evidencia; no se guarda una unidad de medida.',
      photoLabel: 'Foto obligatoria',
      protocolNote: null,
      protocolStatus: 'confirmed',
      showsUnit: false
    };
  }

  if (instrumentType === 'potentiometer') {
    return {
      photoCaption: 'El borrador conserva los campos de texto. La foto se conserva de forma segura al pulsar Guardar lectura.',
      photoLabel: 'Foto opcional',
      protocolNote: null,
      protocolStatus: 'confirmed',
      showsUnit: true
    };
  }

  if (instrumentType === 'digital_level' || instrumentType === 'fissure_gauge') {
    return {
      photoCaption: 'El borrador conserva los campos de texto. La foto se conserva de forma segura al pulsar Guardar lectura.',
      photoLabel: 'Foto opcional',
      protocolNote: null,
      protocolStatus: 'confirmed',
      showsUnit: true
    };
  }

  const provisionalNotes: Partial<Record<InstrumentType, string>> = {
    cant_rule: 'Este formulario aún guarda un valor simple; no representa las referencias de ambos carriles del procedimiento.',
    clinometer: 'Este formulario aún guarda un valor simple; confirma el modelo y el procedimiento antes de usarlo como registro técnico.',
    convergence_tape: 'Este formulario aún guarda un valor simple; no representa el par de referencias, la sección, la tensión ni la temperatura.',
    distometer: 'Este formulario aún guarda un valor simple; confirma las referencias y unidades del equipo antes de usarlo como registro técnico.',
    inclinometer: 'Este formulario aún guarda un valor simple; no representa un perfil inclinométrico ni sus lecturas por profundidad.',
    linometer: 'La identificación y el procedimiento del linómetro siguen pendientes; esta captura es solo un valor provisional.',
    piezometer: 'La captura del piezómetro sigue pendiente de confirmar según el modelo y el procedimiento de campo.'
  };

  return {
    photoCaption: 'El borrador conserva los campos de texto. La foto se conserva de forma segura al pulsar Guardar lectura.',
    photoLabel: 'Foto opcional',
    protocolNote: provisionalNotes[instrumentType] ?? 'Este formulario guarda un valor simple y no sustituye el procedimiento confirmado del equipo.',
    protocolStatus: 'provisional',
    showsUnit: true
  };
};
