import { pool } from '../db/pool.js';
import { AppError } from './app-error.js';

export const WORK_EXECUTION_MIGRATION = '029_monitoring_work_execution_events.sql';

const REQUIRED_COLUMNS = [
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
] as const;

const CAPABILITY_TTL_MS = 30_000;

type WorkExecutionCapabilityReason = 'ready' | 'migration_missing' | 'schema_incomplete';

export type WorkExecutionCapability = {
  available: boolean;
  checkedAt: string;
  migration: typeof WORK_EXECUTION_MIGRATION;
  missingColumns: string[];
  missingRequirements: string[];
  reason: WorkExecutionCapabilityReason;
};

type CapabilityProbeRow = {
  client_request_unique: boolean;
  deny_policy_exists: boolean;
  point_round_fk: boolean;
  point_time_index: boolean;
  present_columns: string[] | null;
  project_time_index: boolean;
  rls_enabled: boolean;
  round_project_fk: boolean;
  table_exists: boolean;
};

type CapabilityProbe = () => Promise<CapabilityProbeRow>;

type CachedCapability = {
  expiresAt: number;
  value: WorkExecutionCapability;
};

let cachedCapability: CachedCapability | null = null;

const defaultProbe: CapabilityProbe = async () => {
  const result = await pool.query<CapabilityProbeRow>(
    `
      SELECT
        to_regclass('public.monitoring_work_execution_events') IS NOT NULL AS table_exists,
        ARRAY(
          SELECT column_name::text
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'monitoring_work_execution_events'
          ORDER BY column_name
        ) AS present_columns,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.monitoring_work_execution_events')
            AND constraint_row.contype = 'u'
            AND pg_get_constraintdef(constraint_row.oid) = 'UNIQUE (client_request_id)'
        ) AS client_request_unique,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.monitoring_work_execution_events')
            AND constraint_row.conname = 'monitoring_work_execution_events_round_project_fkey'
        ) AS round_project_fk,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.monitoring_work_execution_events')
            AND constraint_row.conname = 'monitoring_work_execution_events_point_round_fkey'
        ) AS point_round_fk,
        to_regclass('public.idx_monitoring_work_execution_events_point_time') IS NOT NULL AS point_time_index,
        to_regclass('public.idx_monitoring_work_execution_events_project_time') IS NOT NULL AS project_time_index,
        COALESCE((
          SELECT relation.relrowsecurity
          FROM pg_class relation
          WHERE relation.oid = to_regclass('public.monitoring_work_execution_events')
        ), FALSE) AS rls_enabled,
        EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'monitoring_work_execution_events'
            AND policyname = 'legacy deny all'
        ) AS deny_policy_exists
    `
  );

  return result.rows[0] ?? {
    client_request_unique: false,
    deny_policy_exists: false,
    point_round_fk: false,
    point_time_index: false,
    present_columns: [],
    project_time_index: false,
    rls_enabled: false,
    round_project_fk: false,
    table_exists: false
  };
};

export const evaluateWorkExecutionCapability = (
  row: CapabilityProbeRow,
  checkedAt = new Date().toISOString()
): WorkExecutionCapability => {
  const presentColumns = new Set(row.present_columns ?? []);
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !presentColumns.has(column));
  const requiredChecks: Array<[string, boolean]> = [
    ['client_request_id_unique', row.client_request_unique],
    ['round_project_fk', row.round_project_fk],
    ['point_round_fk', row.point_round_fk],
    ['point_time_index', row.point_time_index],
    ['project_time_index', row.project_time_index],
    ['rls_enabled', row.rls_enabled],
    ['legacy_deny_all_policy', row.deny_policy_exists]
  ];
  const missingRequirements = requiredChecks.filter(([, present]) => !present).map(([name]) => name);
  const available = row.table_exists && missingColumns.length === 0 && missingRequirements.length === 0;

  return {
    available,
    checkedAt,
    migration: WORK_EXECUTION_MIGRATION,
    missingColumns,
    missingRequirements,
    reason: available ? 'ready' : row.table_exists ? 'schema_incomplete' : 'migration_missing'
  };
};

export const refreshWorkExecutionCapability = async (
  probe: CapabilityProbe = defaultProbe
): Promise<WorkExecutionCapability> => {
  const value = evaluateWorkExecutionCapability(await probe());
  cachedCapability = {
    expiresAt: Date.now() + CAPABILITY_TTL_MS,
    value
  };
  return value;
};

export const getWorkExecutionCapability = async (): Promise<WorkExecutionCapability> => {
  if (cachedCapability && cachedCapability.expiresAt > Date.now()) {
    return cachedCapability.value;
  }

  return refreshWorkExecutionCapability();
};

export const requireWorkExecutionCapability = async () => {
  const capability = await getWorkExecutionCapability();
  if (!capability.available) {
    throw new AppError(
      'Work execution schema is not ready',
      503,
      'WORK_EXECUTION_SCHEMA_UNAVAILABLE',
      capability
    );
  }

  return capability;
};

export const resetWorkExecutionCapabilityCacheForTests = () => {
  cachedCapability = null;
};
