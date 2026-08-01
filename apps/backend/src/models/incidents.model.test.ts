import assert from 'node:assert/strict';
import test from 'node:test';

import { buildIncidentResourceScopeCondition } from './incidents.model.js';

const projectA = '11111111-1111-1111-1111-111111111111';

test('incident resource lookups scope stations and prisms to the actor project', () => {
  const stationScope = buildIncidentResourceScopeCondition([projectA], 's', 2);
  const prismScope = buildIncidentResourceScopeCondition([projectA], 'p', 2);

  assert.equal(stationScope.clause, 'AND s.project_id = ANY($2::uuid[])');
  assert.equal(prismScope.clause, 'AND p.project_id = ANY($2::uuid[])');
  assert.deepEqual(stationScope.params, [[projectA]]);
  assert.deepEqual(prismScope.params, [[projectA]]);
});

test('incident resource lookups deny actors with no active project memberships', () => {
  const scope = buildIncidentResourceScopeCondition([], 's', 2);

  assert.equal(scope.clause, 'AND 1=0');
  assert.deepEqual(scope.params, []);
});
