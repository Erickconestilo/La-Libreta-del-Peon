import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';

import { AppError } from './app-error.js';
import { listWeeklyWorkController } from '../controllers/weekly-work.controller.js';
import {
  evaluateWeeklyWorkCapability,
  refreshWeeklyWorkCapability,
  requireWeeklyWorkCapability,
  requiredSchemaCapabilitiesReady,
  resetWeeklyWorkCapabilityCacheForTests,
  WEEKLY_WORK_MIGRATION
} from './weekly-work-capability.js';

const REQUIRED_COLUMNS = [
  'category',
  'client_request_id',
  'completed_at',
  'created_at',
  'created_by',
  'deleted_at',
  'deleted_by',
  'id',
  'notes',
  'project_id',
  'status',
  'title',
  'updated_at',
  'version',
  'work_date'
];

const READY_REQUIREMENTS = {
  category_check: true,
  completed_state_check: true,
  delete_actor_check: true,
  deny_policy_exists: true,
  project_date_index: true,
  rls_enabled: true,
  status_check: true,
  table_exists: true,
  title_not_blank_check: true,
  unique_creator_request: true,
  version_positive_check: true
};

test('weekly work capability reports migration 030 missing without throwing', () => {
  const capability = evaluateWeeklyWorkCapability(
    {
      category_check: false,
      completed_state_check: false,
      delete_actor_check: false,
      deny_policy_exists: false,
      project_date_index: false,
      present_columns: [],
      rls_enabled: false,
      status_check: false,
      table_exists: false,
      title_not_blank_check: false,
      unique_creator_request: false,
      version_positive_check: false
    },
    '2026-09-16T18:00:00.000Z'
  );

  assert.equal(capability.available, false);
  assert.equal(capability.reason, 'migration_missing');
  assert.equal(capability.migration, WEEKLY_WORK_MIGRATION);
  assert.deepEqual(capability.missingColumns, REQUIRED_COLUMNS);
  assert.equal(capability.missingRequirements.length, 10);
});

test('weekly work capability distinguishes incomplete and ready schema', async () => {
  resetWeeklyWorkCapabilityCacheForTests();
  const incomplete = await refreshWeeklyWorkCapability(async () => ({
    ...READY_REQUIREMENTS,
    present_columns: REQUIRED_COLUMNS.filter((column) => column !== 'version'),
    version_positive_check: false
  }));
  assert.equal(incomplete.available, false);
  assert.equal(incomplete.reason, 'schema_incomplete');
  assert.deepEqual(incomplete.missingColumns, ['version']);
  assert.deepEqual(incomplete.missingRequirements, ['version_positive_check']);
  await assert.rejects(
    () => requireWeeklyWorkCapability(),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 503
      && error.code === 'WEEKLY_WORK_SCHEMA_UNAVAILABLE'
  );

  const ready = await refreshWeeklyWorkCapability(async () => ({
    ...READY_REQUIREMENTS,
    present_columns: REQUIRED_COLUMNS
  }));
  assert.equal(ready.available, true);
  assert.equal(ready.reason, 'ready');
  await assert.doesNotReject(() => requireWeeklyWorkCapability());
  resetWeeklyWorkCapabilityCacheForTests();
});

test('aggregate schema readiness requires both 029 and 030', () => {
  assert.equal(requiredSchemaCapabilitiesReady({ available: true }, { available: true }), true);
  assert.equal(requiredSchemaCapabilitiesReady({ available: false }, { available: true }), false);
  assert.equal(requiredSchemaCapabilitiesReady({ available: true }, { available: false }), false);
  assert.equal(requiredSchemaCapabilitiesReady({ available: false }, { available: false }), false);
});

test('weekly work capability fails closed when its probe throws', async () => {
  resetWeeklyWorkCapabilityCacheForTests();
  await assert.rejects(
    () => refreshWeeklyWorkCapability(async () => {
      throw new Error('probe failed');
    }),
    /probe failed/
  );
  resetWeeklyWorkCapabilityCacheForTests();
});

test('weekly work controller returns controlled 503 before querying when 030 is unavailable', async () => {
  resetWeeklyWorkCapabilityCacheForTests();
  await refreshWeeklyWorkCapability(async () => ({
    category_check: false,
    completed_state_check: false,
    delete_actor_check: false,
    deny_policy_exists: false,
    project_date_index: false,
    present_columns: [],
    rls_enabled: false,
    status_check: false,
    table_exists: false,
    title_not_blank_check: false,
    unique_creator_request: false,
    version_positive_check: false
  }));

  let statusCode = 200;
  let payload: unknown;
  const response = {
    json(value: unknown) {
      payload = value;
      return this;
    },
    status(value: number) {
      statusCode = value;
      return this;
    }
  } as unknown as Response;
  const request = {
    params: { projectId: '33333333-3333-4333-8333-333333333333' },
    query: { weekStart: '2026-09-14' },
    user: {
      authProvider: 'supabase',
      email: 'admin@example.test',
      id: '22222222-2222-4222-8222-222222222222',
      projectIds: null,
      role: 'admin'
    }
  } as unknown as Request;

  await listWeeklyWorkController(request, response);

  assert.equal(statusCode, 503);
  const errorPayload = payload as {
    data: null;
    error: {
      code: string;
      details: {
        available: boolean;
        checkedAt: string;
        migration: string;
        missingColumns: string[];
        missingRequirements: string[];
        reason: string;
      };
      message: string;
    };
  };
  assert.equal(errorPayload.data, null);
  assert.equal(errorPayload.error.code, 'WEEKLY_WORK_SCHEMA_UNAVAILABLE');
  assert.equal(errorPayload.error.message, 'Weekly work schema is not ready');
  assert.equal(errorPayload.error.details.available, false);
  assert.equal(errorPayload.error.details.migration, WEEKLY_WORK_MIGRATION);
  assert.equal(errorPayload.error.details.reason, 'migration_missing');
  assert.ok(Number.isFinite(Date.parse(errorPayload.error.details.checkedAt)));
  assert.deepEqual(errorPayload.error.details.missingColumns, REQUIRED_COLUMNS);
  assert.deepEqual(errorPayload.error.details.missingRequirements, [
    'created_by_client_request_id_unique',
    'project_date_index',
    'rls_enabled',
    'legacy_deny_all_policy',
    'title_not_blank_check',
    'completed_state_check',
    'delete_actor_check',
    'version_positive_check',
    'category_check',
    'status_check'
  ]);
  resetWeeklyWorkCapabilityCacheForTests();
});
