import assert from 'node:assert/strict';
import test from 'node:test';

import { validateCreateStationMessageInput } from './station-messages-validation.js';

test('station message accepts an optional clientRequestId (UUID)', () => {
  const parsed = validateCreateStationMessageInput({
    body: 'Nivel de referencia comprobado',
    clientRequestId: '11111111-1111-4111-8111-111111111111'
  });

  assert.equal(parsed.clientRequestId, '11111111-1111-4111-8111-111111111111');
  assert.equal(parsed.body, 'Nivel de referencia comprobado');
});

test('station message works without clientRequestId (compatibilidad hacia atrás)', () => {
  const parsed = validateCreateStationMessageInput({ body: 'Mensaje sin outbox' });

  assert.equal(parsed.clientRequestId, undefined);
});

test('station message rejects a clientRequestId that is not a valid UUID', () => {
  assert.throws(
    () =>
      validateCreateStationMessageInput({
        body: 'Mensaje con id inválido',
        clientRequestId: 'no-es-un-uuid'
      }),
    /Invalid station message payload/
  );
});
