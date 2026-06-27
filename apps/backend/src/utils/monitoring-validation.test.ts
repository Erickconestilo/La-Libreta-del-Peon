import assert from 'node:assert/strict';
import test from 'node:test';

import { validateCreateInstrumentReadingInput, validateCreateRoundPointInput } from './monitoring-validation.js';

test('round point creation only accepts pending status', () => {
  assert.equal(
    validateCreateRoundPointInput({
      controlPointId: '11111111-1111-4111-8111-111111111111',
      expectedInstrumentType: 'digital_level'
    }).status,
    'pending'
  );

  assert.throws(
    () =>
      validateCreateRoundPointInput({
        controlPointId: '11111111-1111-4111-8111-111111111111',
        expectedInstrumentType: 'digital_level',
        status: 'taken'
      }),
    /Invalid round point payload/
  );
});

test('instrument reading creation requires numeric or text value', () => {
  assert.throws(
    () =>
      validateCreateInstrumentReadingInput({
        clientRequestId: '11111111-1111-4111-8111-111111111111',
        measuredAt: '2026-06-27T10:00:00.000Z'
      }),
    /Invalid instrument reading payload/
  );

  assert.equal(
    validateCreateInstrumentReadingInput({
      clientRequestId: '11111111-1111-4111-8111-111111111111',
      measuredAt: '2026-06-27T10:00:00.000Z',
      valueText: 'sin lectura por vibracion'
    }).valueText,
    'sin lectura por vibracion'
  );
});
