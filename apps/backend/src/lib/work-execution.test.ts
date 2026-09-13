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
