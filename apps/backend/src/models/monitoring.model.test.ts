import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '../lib/app-error.js';
import {
  assertMonitoringRoundStatusTransition,
  buildProjectScopeCondition,
  mapInstrumentReadingContextRow,
  toIsoTimestamp
} from './monitoring.model.js';

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

test('keeps project scope in the reading context used for photo uploads', () => {
  assert.deepEqual(
    mapInstrumentReadingContextRow({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      project_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      round_point_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    }),
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      projectId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      roundPointId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    }
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


test('round export applies the actor project scope to its data query', () => {
  const modelSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../src/models/monitoring.model.ts'),
    'utf8'
  );
  const exportSource = modelSource.slice(
    modelSource.indexOf('export const getMonitoringRoundExportRows'),
    modelSource.indexOf('export const createReadingAttachment')
  );

  assert.equal(
    (exportSource.match(/WHERE mr\.id = \$1\s+\$\{scope\.clause\}/g) ?? []).length,
    2
  );
});
