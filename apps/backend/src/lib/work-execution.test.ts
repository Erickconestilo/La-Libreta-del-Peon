import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { AppError } from './app-error.js';
import {
  evaluateWorkExecutionCapability,
  refreshWorkExecutionCapability,
  requireWorkExecutionCapability,
  resetWorkExecutionCapabilityCacheForTests,
  WORK_EXECUTION_MIGRATION
} from './work-execution-capability.js';
import {
  buildExportWorkExecutionJoin,
  buildJourneyWorkExecutionJoin,
  buildRoundPointWorkExecutionJoin,
  isEquivalentWorkExecutionReplay
} from '../models/monitoring.model.js';
import { validateCreateWorkExecutionEventInput } from '../utils/monitoring-validation.js';

const UUID = '11111111-1111-4111-8111-111111111111';
const READY_SCHEMA_REQUIREMENTS = {
  client_request_unique: true,
  deny_policy_exists: true,
  point_round_fk: true,
  point_time_index: true,
  project_time_index: true,
  rls_enabled: true,
  round_project_fk: true
};

test('work execution events require a reason for blocked outcomes', () => {
  assert.deepEqual(
    validateCreateWorkExecutionEventInput({
      clientRequestId: UUID,
      eventType: 'completed'
    }),
    {
      clientRequestId: UUID,
      eventType: 'completed'
    }
  );

  assert.throws(
    () => validateCreateWorkExecutionEventInput({ clientRequestId: UUID, eventType: 'blocked' }),
    (error: unknown) => error instanceof AppError && error.code === 'INVALID_WORK_EXECUTION_EVENT_PAYLOAD'
  );
});

test('work execution migration is append-only, idempotent and tenant-scoped', () => {
  const migration = readFileSync(
    resolve(process.cwd(), 'migrations/029_monitoring_work_execution_events.sql'),
    'utf8'
  );

  assert.match(migration, /CREATE TABLE IF NOT EXISTS monitoring_work_execution_events/);
  assert.match(migration, /client_request_id UUID NOT NULL UNIQUE/);
  assert.match(migration, /event_type IN \('started', 'completed', 'not_done', 'repeat_required', 'blocked'\)/);
  assert.match(migration, /length\(trim\(coalesce\(reason, ''\)\)\) > 0/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_monitoring_rounds_id_project/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_monitoring_round_points_id_round/);
  assert.match(migration, /monitoring_work_execution_events_round_project_fkey/);
  assert.match(migration, /FOREIGN KEY \(round_id, project_id\)\s+REFERENCES monitoring_rounds\(id, project_id\)/);
  assert.match(migration, /monitoring_work_execution_events_point_round_fkey/);
  assert.match(migration, /FOREIGN KEY \(round_point_id, round_id\)\s+REFERENCES monitoring_round_points\(id, round_id\)/);
  assert.match(migration, /ALTER TABLE monitoring_work_execution_events ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /CREATE POLICY "legacy deny all" ON monitoring_work_execution_events/);
});

test('deployment health gate uses schema-aware readiness instead of liveness', () => {
  const renderConfig = readFileSync(resolve(process.cwd(), 'render.yaml'), 'utf8');
  const appSource = readFileSync(resolve(process.cwd(), 'src/app.ts'), 'utf8');

  assert.match(renderConfig, /healthCheckPath:\s*\/api\/v1\/readiness/);
  assert.match(appSource, /app\.get\('\/api\/v1\/readiness'/);
  assert.match(appSource, /response\.status\(workExecution\.available \? 200 : 503\)/);
});

test('work execution capability reports migration 029 missing without throwing', () => {
  const capability = evaluateWorkExecutionCapability(
    {
      client_request_unique: false,
      deny_policy_exists: false,
      point_round_fk: false,
      point_time_index: false,
      present_columns: [],
      project_time_index: false,
      rls_enabled: false,
      round_project_fk: false,
      table_exists: false
    },
    '2026-09-13T10:00:00.000Z'
  );

  assert.deepEqual(capability, {
    available: false,
    checkedAt: '2026-09-13T10:00:00.000Z',
    migration: WORK_EXECUTION_MIGRATION,
    missingColumns: [
      'client_request_id',
      'created_at',
      'event_type',
      'id',
      'notes',
      'occurred_at',
      'project_id',
      'reason',
      'recorded_by',
      'round_id',
      'round_point_id'
    ],
    missingRequirements: [
      'client_request_id_unique',
      'round_project_fk',
      'point_round_fk',
      'point_time_index',
      'project_time_index',
      'rls_enabled',
      'legacy_deny_all_policy'
    ],
    reason: 'migration_missing'
  });
});

test('work execution capability distinguishes an incomplete schema from a ready schema', async () => {
  resetWorkExecutionCapabilityCacheForTests();
  const incomplete = await refreshWorkExecutionCapability(async () => ({
    ...READY_SCHEMA_REQUIREMENTS,
    present_columns: ['id', 'round_id', 'round_point_id', 'project_id'],
    table_exists: true
  }));

  assert.equal(incomplete.available, false);
  assert.equal(incomplete.reason, 'schema_incomplete');
  await assert.rejects(
    () => requireWorkExecutionCapability(),
    (error: unknown) => error instanceof AppError && error.statusCode === 503 && error.code === 'WORK_EXECUTION_SCHEMA_UNAVAILABLE'
  );

  const ready = await refreshWorkExecutionCapability(async () => ({
    ...READY_SCHEMA_REQUIREMENTS,
    present_columns: [
      'client_request_id',
      'created_at',
      'event_type',
      'id',
      'notes',
      'occurred_at',
      'project_id',
      'reason',
      'recorded_by',
      'round_id',
      'round_point_id'
    ],
    table_exists: true
  }));

  assert.equal(ready.available, true);
  assert.equal(ready.reason, 'ready');
  await assert.doesNotReject(() => requireWorkExecutionCapability());
  resetWorkExecutionCapabilityCacheForTests();
});

test('legacy monitoring reads avoid migration 029 when the capability is absent', () => {
  for (const sql of [
    buildRoundPointWorkExecutionJoin(false),
    buildJourneyWorkExecutionJoin(false),
    buildExportWorkExecutionJoin(false)
  ]) {
    assert.doesNotMatch(sql, /monitoring_work_execution_events/);
    assert.match(sql, /WHERE FALSE/);
  }

  assert.match(buildRoundPointWorkExecutionJoin(true), /monitoring_work_execution_events/);
  assert.match(buildJourneyWorkExecutionJoin(true), /monitoring_work_execution_events/);
  assert.match(buildExportWorkExecutionJoin(true), /monitoring_work_execution_events/);
});

test('same client request id is idempotent only for the same work execution payload and scope', () => {
  const context = {
    projectId: '22222222-2222-4222-8222-222222222222',
    roundId: '33333333-3333-4333-8333-333333333333'
  };
  const existing = {
    event_type: 'blocked',
    notes: '  acceso norte ',
    occurred_at: '2026-09-13T09:15:00.000Z',
    project_id: context.projectId,
    reason: ' sin acceso ',
    recorded_by: '44444444-4444-4444-8444-444444444444',
    round_id: context.roundId,
    round_point_id: '55555555-5555-4555-8555-555555555555'
  };
  const input = validateCreateWorkExecutionEventInput({
    clientRequestId: UUID,
    eventType: 'blocked',
    notes: 'acceso norte',
    occurredAt: '2026-09-13T09:15:00.000Z',
    reason: 'sin acceso'
  });

  assert.equal(
    isEquivalentWorkExecutionReplay(
      existing,
      '55555555-5555-4555-8555-555555555555',
      context,
      input,
      '44444444-4444-4444-8444-444444444444'
    ),
    true
  );
  assert.equal(
    isEquivalentWorkExecutionReplay(
      existing,
      '55555555-5555-4555-8555-555555555555',
      context,
      { ...input, eventType: 'not_done' },
      '44444444-4444-4444-8444-444444444444'
    ),
    false
  );
  assert.equal(
    isEquivalentWorkExecutionReplay(
      existing,
      '55555555-5555-4555-8555-555555555555',
      { ...context, projectId: '66666666-6666-4666-8666-666666666666' },
      input,
      '44444444-4444-4444-8444-444444444444'
    ),
    false
  );
});

test('work execution queries require matching round, point and project relationships', () => {
  const model = readFileSync(
    resolve(process.cwd(), 'src/models/monitoring.model.ts'),
    'utf8'
  );

  assert.match(model, /wee\.round_id = mrp\.round_id/);
  assert.match(model, /wee\.round_point_id = mrp\.id/);
  assert.match(model, /wee\.project_id = mr\.project_id/);
  assert.match(model, /ON CONFLICT \(client_request_id\) DO NOTHING/);
});
