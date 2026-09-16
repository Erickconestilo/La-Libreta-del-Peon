import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMapEstProjectCode,
  requireMapEstProjectCode,
  requireUniqueProjectId
} from './mapest-project-mapping.js';

test('does not silently assign an unmapped station to a projectless scope', () => {
  const stationName = 'Estación de ejemplo sin proyecto';

  assert.equal(getMapEstProjectCode(stationName), null);
  assert.throws(
    () => requireMapEstProjectCode(stationName),
    /MapEst station is not mapped to a TopoField project; import aborted/
  );
});

test('requires exactly one target project before importing', () => {
  assert.equal(requireUniqueProjectId('example-project', [{ id: 'project-1' }]), 'project-1');
  assert.throws(() => requireUniqueProjectId('example-project', []), /did not resolve to exactly one project/);
  assert.throws(
    () => requireUniqueProjectId('example-project', [{ id: 'a' }, { id: 'b' }]),
    /did not resolve to exactly one project/
  );
});
