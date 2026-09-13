import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { AppError } from './app-error.js';
import { validateCreateWorkExecutionEventInput } from '../utils/monitoring-validation.js';

const UUID = '11111111-1111-4111-8111-111111111111';

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
