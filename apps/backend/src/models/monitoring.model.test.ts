import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { AppError } from '../lib/app-error.js';
import {
  assertMonitoringRoundStatusTransition,
  buildMonitoringPointTenantCondition,
  buildProjectScopeCondition,
  buildReadingPointTenantCondition,
  mapInstrumentReadingContextRow,
  toIsoTimestamp
} from './monitoring.model.js';
import {
  buildMountingEvidenceRelationCondition,
  buildMountingVisitStationScope,
  buildMountingVisitTenantCondition
} from './mounting-visits.model.js';

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

test('mounting visits use the station project as their tenant scope', () => {
  assert.deepEqual(
    buildMountingVisitStationScope(['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'], 2),
    {
      clause: 'AND s.project_id = ANY($2::uuid[])',
      params: [['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']]
    }
  );
});

test('mounting visit queries require the visit and station to share the same project', () => {
  assert.equal(buildMountingVisitTenantCondition(), 's.project_id = v.project_id');
});

test('mounting visit queries reject evidence from a different station', () => {
  assert.equal(
    buildMountingEvidenceRelationCondition(),
    'e.visit_id = v.id AND e.station_id = v.station_id'
  );
});

test('monitoring reads require the round point and control point to share a tenant', () => {
  assert.equal(buildMonitoringPointTenantCondition(), 'cp.project_id = mr.project_id');
  assert.equal(buildReadingPointTenantCondition(), 'ir.control_point_id = mrp.control_point_id');
});

test('reading attachment idempotency remains compatible before migration 028', () => {
  const modelSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../src/models/monitoring.model.ts'),
    'utf8'
  );

  assert.match(modelSource, /pg_advisory_xact_lock\(hashtext\(\$1::text \|\| ':' \|\| \$2::text\)\)/);
  assert.match(modelSource, /ON CONFLICT DO NOTHING\s+RETURNING \*/);
  assert.match(modelSource, /READING_ATTACHMENT_INSERT_INCONSISTENT/);
});

test('station details validate tenant scope before loading associated readings', () => {
  const modelSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../src/models/stations.model.ts'),
    'utf8'
  );

  assert.match(modelSource, /const stationResult = await pool\.query\(stationQuery/);
  assert.match(modelSource, /if \(stationResult\.rowCount === 0\) \{\s+return null;\s+\}/);
  assert.match(modelSource, /const readingsResult = await pool\.query\(readingQuery/);
  assert.doesNotMatch(modelSource, /Promise\.all\(\[\s+pool\.query\(stationQuery[\s\S]*pool\.query\(readingQuery/);
});
