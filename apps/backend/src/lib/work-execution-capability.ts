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
  column_definitions_valid: boolean;
  deny_policy_exists: boolean;
  event_type_check: boolean;
  id_primary_key: boolean;
  point_round_fk: boolean;
  point_time_index: boolean;
  present_columns: string[] | null;
  project_fk: boolean;
  project_time_index: boolean;
  reason_required_check: boolean;
  recorded_by_fk: boolean;
  rls_enabled: boolean;
  round_fk: boolean;
  round_point_fk: boolean;
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
        NOT EXISTS (
          SELECT 1
          FROM (
            VALUES
              ('id', 'uuid', 'NO', 'gen_random_uuid()'),
              ('round_id', 'uuid', 'NO', NULL),
              ('round_point_id', 'uuid', 'NO', NULL),
              ('project_id', 'uuid', 'NO', NULL),
              ('event_type', 'text', 'NO', NULL),
              ('reason', 'text', 'YES', NULL),
              ('notes', 'text', 'YES', NULL),
              ('occurred_at', 'timestamptz', 'NO', 'now()'),
              ('recorded_by', 'uuid', 'NO', NULL),
              ('client_request_id', 'uuid', 'NO', NULL),
              ('created_at', 'timestamptz', 'NO', 'now()')
          ) AS expected(column_name, udt_name, is_nullable, column_default)
          LEFT JOIN information_schema.columns actual
            ON actual.table_schema = 'public'
           AND actual.table_name = 'monitoring_work_execution_events'
           AND actual.column_name = expected.column_name
          WHERE actual.column_name IS NULL
             OR actual.udt_name <> expected.udt_name
             OR actual.is_nullable <> expected.is_nullable
             OR COALESCE(actual.column_default, '') <> COALESCE(expected.column_default, '')
        ) AS column_definitions_valid,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.monitoring_work_execution_events')
            AND constraint_row.conname = 'monitoring_work_execution_events_pkey'
            AND constraint_row.contype = 'p'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) = 'PRIMARY KEY (id)'
        ) AS id_primary_key,
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
            AND constraint_row.conname = 'monitoring_work_execution_events_event_type_check'
            AND constraint_row.contype = 'c'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'CHECK (event_type = ANY (ARRAY[''started''::text, ''completed''::text, ''not_done''::text, ''repeat_required''::text, ''blocked''::text]))'
        ) AS event_type_check,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.monitoring_work_execution_events')
            AND constraint_row.conname = 'monitoring_work_execution_events_check'
            AND constraint_row.contype = 'c'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'CHECK ((event_type = ANY (ARRAY[''started''::text, ''completed''::text])) OR length(TRIM(BOTH FROM COALESCE(reason, ''''::text))) > 0)'
        ) AS reason_required_check,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.monitoring_work_execution_events')
            AND constraint_row.conname = 'monitoring_work_execution_events_project_id_fkey'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE'
        ) AS project_fk,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.monitoring_work_execution_events')
            AND constraint_row.conname = 'monitoring_work_execution_events_recorded_by_fkey'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'FOREIGN KEY (recorded_by) REFERENCES users(id)'
        ) AS recorded_by_fk,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.monitoring_work_execution_events')
            AND constraint_row.conname = 'monitoring_work_execution_events_round_id_fkey'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'FOREIGN KEY (round_id) REFERENCES monitoring_rounds(id) ON DELETE CASCADE'
        ) AS round_fk,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.monitoring_work_execution_events')
            AND constraint_row.conname = 'monitoring_work_execution_events_round_point_id_fkey'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'FOREIGN KEY (round_point_id) REFERENCES monitoring_round_points(id) ON DELETE CASCADE'
        ) AS round_point_fk,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.monitoring_work_execution_events')
            AND constraint_row.conname = 'monitoring_work_execution_events_round_project_fkey'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'FOREIGN KEY (round_id, project_id) REFERENCES monitoring_rounds(id, project_id) ON DELETE CASCADE'
        ) AS round_project_fk,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.monitoring_work_execution_events')
            AND constraint_row.conname = 'monitoring_work_execution_events_point_round_fkey'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'FOREIGN KEY (round_point_id, round_id) REFERENCES monitoring_round_points(id, round_id) ON DELETE CASCADE'
        ) AS point_round_fk,
        EXISTS (
          SELECT 1
          FROM pg_index index_row
          WHERE index_row.indexrelid = to_regclass('public.idx_monitoring_work_execution_events_point_time')
            AND index_row.indrelid = to_regclass('public.monitoring_work_execution_events')
            AND index_row.indisunique = FALSE
            AND index_row.indnkeyatts = 3
            AND pg_get_indexdef(index_row.indexrelid) =
              'CREATE INDEX idx_monitoring_work_execution_events_point_time ON public.monitoring_work_execution_events USING btree (round_point_id, occurred_at DESC, created_at DESC)'
        ) AS point_time_index,
        EXISTS (
          SELECT 1
          FROM pg_index index_row
          WHERE index_row.indexrelid = to_regclass('public.idx_monitoring_work_execution_events_project_time')
            AND index_row.indrelid = to_regclass('public.monitoring_work_execution_events')
            AND index_row.indisunique = FALSE
            AND index_row.indnkeyatts = 2
            AND pg_get_indexdef(index_row.indexrelid) =
              'CREATE INDEX idx_monitoring_work_execution_events_project_time ON public.monitoring_work_execution_events USING btree (project_id, occurred_at DESC)'
        ) AS project_time_index,
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
            AND cmd = 'ALL'
            AND cardinality(roles) = 2
            AND roles::text[] @> ARRAY['anon', 'authenticated']::text[]
            AND qual = 'false'
            AND with_check = 'false'
        ) AS deny_policy_exists
    `
  );

  return result.rows[0] ?? {
    client_request_unique: false,
    column_definitions_valid: false,
    deny_policy_exists: false,
    event_type_check: false,
    id_primary_key: false,
    point_round_fk: false,
    point_time_index: false,
    present_columns: [],
    project_fk: false,
    project_time_index: false,
    reason_required_check: false,
    recorded_by_fk: false,
    rls_enabled: false,
    round_fk: false,
    round_point_fk: false,
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
    ['column_definitions', row.column_definitions_valid],
    ['id_primary_key', row.id_primary_key],
    ['client_request_id_unique', row.client_request_unique],
    ['event_type_check', row.event_type_check],
    ['reason_required_check', row.reason_required_check],
    ['project_fk', row.project_fk],
    ['recorded_by_fk', row.recorded_by_fk],
    ['round_fk', row.round_fk],
    ['round_point_fk', row.round_point_fk],
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
