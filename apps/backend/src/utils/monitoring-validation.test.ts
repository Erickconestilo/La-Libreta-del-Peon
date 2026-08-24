import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateCreateControlPointInput,
  validateCreateControlPointThresholdInput,
  validateCreateInstrumentReadingInput,
  validateCreateReadingAttachmentInput,
  validateCreateMonitoringRoundInput,
  validateCreateRoundPointInput,
  validateUpdateMonitoringRoundStatusInput,
  validateUpdateControlPointInput
} from './monitoring-validation.js';

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

test('reading attachment only accepts photo metadata with bounded text', () => {
  assert.equal(
    validateCreateReadingAttachmentInput({
      storagePath: 'readings/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg',
      title: 'Fisura en clave'
    }).attachmentType,
    'photo'
  );

  assert.throws(
    () =>
      validateCreateReadingAttachmentInput({
        attachmentType: 'file',
        storagePath: 'readings/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg'
      }),
    /Invalid reading attachment payload/
  );
});

test('monitoring round creation defaults to draft status and requires a plain date', () => {
  assert.equal(
    validateCreateMonitoringRoundInput({
      name: 'Ronda semanal linea 8',
      roundDate: '2026-08-03'
    }).status,
    'draft'
  );

  assert.throws(
    () =>
      validateCreateMonitoringRoundInput({
        name: 'Ronda semanal linea 8',
        roundDate: '2026-08-03T10:00:00.000Z'
      }),
    /Invalid monitoring round payload/
  );
});

test('round status updates only accept non-terminal transitions', () => {
  assert.equal(validateUpdateMonitoringRoundStatusInput({ status: 'active' }).status, 'active');
  assert.equal(validateUpdateMonitoringRoundStatusInput({ status: 'closed' }).status, 'closed');
  assert.throws(
    () => validateUpdateMonitoringRoundStatusInput({ status: 'draft' }),
    /Invalid monitoring round status payload/
  );
});

test('control point creation requires code and a valid environment', () => {
  assert.equal(
    validateCreateControlPointInput({
      code: 'PK-100+500',
      environment: 'tunnel'
    }).environment,
    'tunnel'
  );

  assert.throws(
    () =>
      validateCreateControlPointInput({
        code: 'PK-100+500',
        environment: 'space'
      }),
    /Invalid control point payload/
  );
});

test('control point update requires at least one field', () => {
  assert.throws(() => validateUpdateControlPointInput({}), /Invalid control point update payload/);

  assert.equal(validateUpdateControlPointInput({ isActive: false }).isActive, false);
});

test('control point threshold enforces alarm >= warning and validTo after validFrom', () => {
  assert.throws(
    () =>
      validateCreateControlPointThresholdInput({
        alarmValue: 5,
        instrumentType: 'piezometer',
        unit: 'm',
        validFrom: '2026-01-01T00:00:00.000Z',
        warningValue: 10
      }),
    /Invalid threshold payload/
  );

  assert.throws(
    () =>
      validateCreateControlPointThresholdInput({
        instrumentType: 'piezometer',
        unit: 'm',
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: '2025-01-01T00:00:00.000Z'
      }),
    /Invalid threshold payload/
  );

  assert.equal(
    validateCreateControlPointThresholdInput({
      alarmValue: 10,
      instrumentType: 'piezometer',
      unit: 'm',
      validFrom: '2026-01-01T00:00:00.000Z',
      warningValue: 5
    }).alarmValue,
    10
  );
});
