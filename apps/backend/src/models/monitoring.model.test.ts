import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../lib/app-error.js';
import { assertMonitoringRoundStatusTransition, buildProjectScopeCondition, toIsoTimestamp } from './monitoring.model.js';

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

test('normalizes database timestamps before an idempotent reading retry', () => {
  assert.equal(
    toIsoTimestamp(new Date('2026-07-31T08:45:25.061Z')),
    '2026-07-31T08:45:25.061Z'
  );
  assert.equal(
    toIsoTimestamp('2026-07-31T08:45:25.061Z'),
    '2026-07-31T08:45:25.061Z'
  );
});

test('only allows active rounds to close when no point is pending', () => {
  assert.doesNotThrow(() => assertMonitoringRoundStatusTransition('active', 'closed', false));
  assert.throws(
    () => assertMonitoringRoundStatusTransition('active', 'closed', true),
    (error: unknown) => error instanceof AppError && error.code === 'ROUND_HAS_PENDING_POINTS'
  );
  assert.throws(
    () => assertMonitoringRoundStatusTransition('draft', 'closed', false),
    (error: unknown) => error instanceof AppError && error.code === 'INVALID_ROUND_TRANSITION'
  );
});

test('terminal rounds cannot be changed', () => {
  assert.throws(
    () => assertMonitoringRoundStatusTransition('closed', 'cancelled', false),
    (error: unknown) => error instanceof AppError && error.code === 'ROUND_TERMINAL'
  );
});
