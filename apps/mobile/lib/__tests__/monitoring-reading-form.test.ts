import { describe, expect, it } from '@jest/globals';

import { getReadingCaptureCopy } from '../monitoring-reading-form';

describe('monitoring reading form', () => {
  it('trata el testigo fotográfico como evidencia obligatoria sin unidad', () => {
    expect(getReadingCaptureCopy('fissure_witness')).toEqual({
      photoCaption: 'La foto y la fecha son la evidencia; no se guarda una unidad de medida.',
      photoLabel: 'Foto obligatoria',
      protocolNote: null,
      protocolStatus: 'confirmed',
      showsUnit: false
    });
  });

  it('mantiene foto opcional y unidad para una lectura escalar', () => {
    expect(getReadingCaptureCopy('digital_level')).toEqual({
      photoCaption: 'El borrador conserva los campos de texto. La foto se conserva de forma segura al pulsar Guardar lectura.',
      photoLabel: 'Foto opcional',
      protocolNote: null,
      protocolStatus: 'confirmed',
      showsUnit: true
    });
  });

  it('mantiene la unidad visible para el protocolo de potenciómetro', () => {
    expect(getReadingCaptureCopy('potentiometer')).toMatchObject({
      protocolNote: null,
      protocolStatus: 'confirmed',
      showsUnit: true
    });
  });

  it('marca como provisional una captura que todavía no representa el protocolo completo', () => {
    expect(getReadingCaptureCopy('convergence_tape')).toEqual({
      photoCaption: 'El borrador conserva los campos de texto. La foto se conserva de forma segura al pulsar Guardar lectura.',
      photoLabel: 'Foto opcional',
      protocolNote: 'Este formulario aún guarda un valor simple; no representa el par de referencias, la sección, la tensión ni la temperatura.',
      protocolStatus: 'provisional',
      showsUnit: true
    });
  });

  it('mantiene la captura provisional para instrumentos cuyo método está pendiente', () => {
    expect(getReadingCaptureCopy('piezometer').protocolStatus).toBe('provisional');
    expect(getReadingCaptureCopy('inclinometer').protocolNote).toContain('perfil inclinométrico');
  });
});
