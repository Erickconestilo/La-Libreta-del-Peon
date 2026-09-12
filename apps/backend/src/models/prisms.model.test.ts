import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStationProjectScopeCondition } from './prisms.model.js';

const projectA = '11111111-1111-1111-1111-111111111111';

test('station prism listings reject cross-project prism references', () => {
  const scope = buildStationProjectScopeCondition([projectA], 2);

  assert.match(scope.clause, /s\.project_id = ANY\(\$2::uuid\[\]\)/);
  assert.match(scope.clause, /p\.project_id IS NULL OR p\.project_id = s\.project_id/);
  assert.deepEqual(scope.params, [[projectA]]);
});
