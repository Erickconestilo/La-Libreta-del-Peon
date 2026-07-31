import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProjectScopeCondition } from './monitoring.model.js';

test('uses projects.id when scoping a projects query', () => {
  const scope = buildProjectScopeCondition(
    ['11111111-1111-1111-1111-111111111111'],
    'p',
    9,
    'id',
  );

  assert.equal(scope.clause, 'AND p.id = ANY($9::uuid[])');
  assert.deepEqual(scope.params, [['11111111-1111-1111-1111-111111111111']]);
});

test('uses project_id by default for monitoring child tables', () => {
  const scope = buildProjectScopeCondition(
    ['11111111-1111-1111-1111-111111111111'],
    'mr',
    3,
  );

  assert.equal(scope.clause, 'AND mr.project_id = ANY($3::uuid[])');
  assert.deepEqual(scope.params, [['11111111-1111-1111-1111-111111111111']]);
});
