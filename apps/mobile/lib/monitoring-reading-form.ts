import type { InstrumentType } from '@shared/types';

export type ReadingCaptureCopy = {
  photoCaption: string;
  photoLabel: string;
  showsUnit: boolean;
};

export const getReadingCaptureCopy = (instrumentType: InstrumentType): ReadingCaptureCopy => {
  if (instrumentType === 'fissure_witness') {
    return {
      photoCaption: 'La foto y la fecha son la evidencia; no se guarda una unidad de medida.',
      photoLabel: 'Foto obligatoria',
      showsUnit: false
    };
  }

  return {
    photoCaption: 'El borrador conserva los campos de texto. La foto se conserva de forma segura al pulsar Guardar lectura.',
    photoLabel: 'Foto opcional',
    showsUnit: true
  };
};
