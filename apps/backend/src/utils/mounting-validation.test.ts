import assert from 'node:assert/strict';
import test from 'node:test';

import { validateCreateMountingEvidenceInput, validateCreateMountingVisitInput } from './mounting-validation.js';

const clientRequestId = '44444444-4444-4444-8444-444444444444';

test('mounting visit input keeps the visit status explicit and idempotent', () => {
  const visit = validateCreateMountingVisitInput({
    changeSummary: 'La referencia visible desde el acceso cambió.',
    clientRequestId,
    notes: 'Revisar antes de la próxima visita.',
    status: 'draft'
  });

  assert.equal(visit.status, 'draft');
  assert.equal(visit.clientRequestId, clientRequestId);
});

test('mounting evidence constrains relative photo positions to the image', () => {
  assert.equal(
    validateCreateMountingEvidenceInput({
      clientRequestId,
      kind: 'prism',
      positionX: 0.25,
      positionY: 0.8,
      storagePath: 'mounting-visits/33333333-3333-4333-8333-333333333333/44444444-4444-4444-8444-444444444444.jpg'
    }).positionX,
    0.25
  );

  assert.throws(
    () => validateCreateMountingEvidenceInput({
      clientRequestId,
      kind: 'prism',
      positionX: 1.1,
      storagePath: 'mounting-visits/33333333-3333-4333-8333-333333333333/44444444-4444-4444-8444-444444444444.jpg'
    }),
    /Invalid mounting evidence payload/
  );
});
