import { describe, expect, it } from '@jest/globals';

import { getReadingCaptureCopy } from '../monitoring-reading-form';

describe('monitoring reading form', () => {
  it('trata el testigo fotográfico como evidencia obligatoria sin unidad', () => {
    expect(getReadingCaptureCopy('fissure_witness')).toEqual({
      photoCaption: 'La foto y la fecha son la evidencia; no se guarda una unidad de medida.',
      photoLabel: 'Foto obligatoria',
      showsUnit: false
    });
  });

  it('mantiene foto opcional y unidad para una lectura escalar', () => {
    expect(getReadingCaptureCopy('digital_level')).toEqual({
      photoCaption: 'El borrador conserva los campos de texto. La foto se conserva de forma segura al pulsar Guardar lectura.',
      photoLabel: 'Foto opcional',
      showsUnit: true
    });
  });

  it('mantiene la unidad visible para el protocolo de potenciómetro', () => {
    expect(getReadingCaptureCopy('potentiometer').showsUnit).toBe(true);
  });
});
