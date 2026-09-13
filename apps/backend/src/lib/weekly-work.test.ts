import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { AppError } from './app-error.js';
import { isEquivalentWeeklyWorkReplay } from '../models/weekly-work.model.js';
import {
  validateCreateWeeklyWorkItemInput,
  validateUpdateWeeklyWorkItemInput,
  validateWeeklyWorkQuery
} from '../utils/weekly-work-validation.js';

const REQUEST_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ID = '33333333-3333-4333-8333-333333333333';

test('weekly work query requires a Monday week start', () => {
  assert.deepEqual(validateWeeklyWorkQuery({ weekStart: '2026-09-14' }), { weekStart: '2026-09-14' });
  assert.throws(
    () => validateWeeklyWorkQuery({ weekStart: '2026-09-13' }),
    (error: unknown) => error instanceof AppError && error.code === 'INVALID_WEEKLY_WORK_QUERY'
  );
});

test('weekly work validation keeps planning fields small and explicit', () => {
  assert.deepEqual(
    validateCreateWeeklyWorkItemInput({
      category: 'leveling',
      clientRequestId: REQUEST_ID,
      title: 'Nivelación Campus Nord',
      workDate: '2026-09-14'
    }),
    {
      category: 'leveling',
      clientRequestId: REQUEST_ID,
      status: 'planned',
      title: 'Nivelación Campus Nord',
      workDate: '2026-09-14'
    }
  );
  assert.throws(
    () => validateUpdateWeeklyWorkItemInput({ version: 1 }),
    (error: unknown) => error instanceof AppError && error.code === 'INVALID_WEEKLY_WORK_UPDATE_PAYLOAD'
  );
});

test('weekly work replay is idempotent only for the same creator, project and payload', () => {
  const input = validateCreateWeeklyWorkItemInput({
    category: 'manual',
    clientRequestId: REQUEST_ID,
    notes: ' acceso norte ',
    title: 'Potenciómetros',
    workDate: '2026-09-15'
  });
  const row = {
    category: 'manual',
    created_by: USER_ID,
    notes: 'acceso norte',
    project_id: PROJECT_ID,
    status: 'planned',
    title: 'Potenciómetros',
    work_date: '2026-09-15'
  };
  assert.equal(isEquivalentWeeklyWorkReplay(row, PROJECT_ID, input, USER_ID), true);
  assert.equal(isEquivalentWeeklyWorkReplay(row, PROJECT_ID, { ...input, title: 'Otro trabajo' }, USER_ID), false);
});

test('weekly work migration is project scoped, idempotent, versioned and soft deletable', () => {
  const migration = readFileSync(resolve(process.cwd(), 'migrations/030_project_weekly_work.sql'), 'utf8');
  assert.match(migration, /project_id UUID NOT NULL REFERENCES projects\(id\)/);
  assert.match(migration, /UNIQUE \(created_by, client_request_id\)/);
  assert.match(migration, /version INTEGER NOT NULL DEFAULT 1/);
  assert.match(migration, /deleted_at TIMESTAMPTZ/);
  assert.match(migration, /deleted_by UUID REFERENCES users\(id\)/);
  assert.match(migration, /ALTER TABLE project_weekly_work_items ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /CREATE POLICY "legacy deny all" ON project_weekly_work_items/);
  assert.doesNotMatch(migration, /monitoring_round_id|round_point_id|instrument_reading/);
});

test('weekly work model uses locks for edits and only soft deletes planned rows', () => {
  const model = readFileSync(resolve(process.cwd(), 'src/models/weekly-work.model.ts'), 'utf8');
  assert.match(model, /FOR UPDATE/);
  assert.match(model, /WEEKLY_WORK_VERSION_CONFLICT/);
  assert.match(model, /row\.status !== 'planned'/);
  assert.match(model, /SET deleted_at = NOW\(\), deleted_by = \$3/);
  assert.match(model, /ON CONFLICT \(created_by, client_request_id\) DO NOTHING/);
});
