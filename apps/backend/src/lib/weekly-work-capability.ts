import { pool } from '../db/pool.js';
import { AppError } from './app-error.js';

export const WEEKLY_WORK_MIGRATION = '030_project_weekly_work.sql';

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
] as const;

const CAPABILITY_TTL_MS = 30_000;

type WeeklyWorkCapabilityReason = 'ready' | 'migration_missing' | 'schema_incomplete';

export type WeeklyWorkCapability = {
  available: boolean;
  checkedAt: string;
  migration: typeof WEEKLY_WORK_MIGRATION;
  missingColumns: string[];
  missingRequirements: string[];
  reason: WeeklyWorkCapabilityReason;
};

type CapabilityProbeRow = {
  category_check: boolean;
  column_definitions_valid: boolean;
  completed_state_check: boolean;
  created_by_fk: boolean;
  delete_actor_check: boolean;
  deleted_by_fk: boolean;
  deny_policy_exists: boolean;
  id_primary_key: boolean;
  project_fk: boolean;
  project_date_index: boolean;
  present_columns: string[] | null;
  rls_enabled: boolean;
  status_check: boolean;
  table_exists: boolean;
  title_not_blank_check: boolean;
  unique_creator_request: boolean;
  version_positive_check: boolean;
};

type CapabilityProbe = () => Promise<CapabilityProbeRow>;

type CachedCapability = {
  expiresAt: number;
  value: WeeklyWorkCapability;
};

let cachedCapability: CachedCapability | null = null;

const defaultProbe: CapabilityProbe = async () => {
  const result = await pool.query<CapabilityProbeRow>(
    `
      SELECT
        to_regclass('public.project_weekly_work_items') IS NOT NULL AS table_exists,
        ARRAY(
          SELECT column_name::text
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'project_weekly_work_items'
          ORDER BY column_name
        ) AS present_columns,
        NOT EXISTS (
          SELECT 1
          FROM (
            VALUES
              ('id', 'uuid', 'NO', 'gen_random_uuid()'),
              ('project_id', 'uuid', 'NO', NULL),
              ('work_date', 'date', 'NO', NULL),
              ('title', 'text', 'NO', NULL),
              ('category', 'text', 'NO', NULL),
              ('status', 'text', 'NO', '''planned''::text'),
              ('notes', 'text', 'YES', NULL),
              ('created_by', 'uuid', 'NO', NULL),
              ('client_request_id', 'uuid', 'NO', NULL),
              ('version', 'int4', 'NO', '1'),
              ('completed_at', 'timestamptz', 'YES', NULL),
              ('created_at', 'timestamptz', 'NO', 'now()'),
              ('updated_at', 'timestamptz', 'NO', 'now()'),
              ('deleted_at', 'timestamptz', 'YES', NULL),
              ('deleted_by', 'uuid', 'YES', NULL)
          ) AS expected(column_name, udt_name, is_nullable, column_default)
          LEFT JOIN information_schema.columns actual
            ON actual.table_schema = 'public'
           AND actual.table_name = 'project_weekly_work_items'
           AND actual.column_name = expected.column_name
          WHERE actual.column_name IS NULL
             OR actual.udt_name <> expected.udt_name
             OR actual.is_nullable <> expected.is_nullable
             OR COALESCE(actual.column_default, '') <> COALESCE(expected.column_default, '')
        ) AS column_definitions_valid,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.project_weekly_work_items')
            AND constraint_row.conname = 'project_weekly_work_items_pkey'
            AND constraint_row.contype = 'p'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) = 'PRIMARY KEY (id)'
        ) AS id_primary_key,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.project_weekly_work_items')
            AND constraint_row.contype = 'u'
            AND pg_get_constraintdef(constraint_row.oid) = 'UNIQUE (created_by, client_request_id)'
        ) AS unique_creator_request,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.project_weekly_work_items')
            AND constraint_row.conname = 'project_weekly_work_items_project_id_fkey'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE'
        ) AS project_fk,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.project_weekly_work_items')
            AND constraint_row.conname = 'project_weekly_work_items_created_by_fkey'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'FOREIGN KEY (created_by) REFERENCES users(id)'
        ) AS created_by_fk,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.project_weekly_work_items')
            AND constraint_row.conname = 'project_weekly_work_items_deleted_by_fkey'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'FOREIGN KEY (deleted_by) REFERENCES users(id)'
        ) AS deleted_by_fk,
        EXISTS (
          SELECT 1
          FROM pg_index index_row
          WHERE index_row.indexrelid = to_regclass('public.idx_project_weekly_work_items_project_date')
            AND index_row.indrelid = to_regclass('public.project_weekly_work_items')
            AND index_row.indisunique = FALSE
            AND index_row.indnkeyatts = 4
            AND pg_get_indexdef(index_row.indexrelid) =
              'CREATE INDEX idx_project_weekly_work_items_project_date ON public.project_weekly_work_items USING btree (project_id, work_date, created_at, id) WHERE (deleted_at IS NULL)'
        ) AS project_date_index,
        COALESCE((
          SELECT relation.relrowsecurity
          FROM pg_class relation
          WHERE relation.oid = to_regclass('public.project_weekly_work_items')
        ), FALSE) AS rls_enabled,
        EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'project_weekly_work_items'
            AND policyname = 'legacy deny all'
            AND cmd = 'ALL'
            AND cardinality(roles) = 2
            AND roles::text[] @> ARRAY['anon', 'authenticated']::text[]
            AND qual = 'false'
            AND with_check = 'false'
        ) AS deny_policy_exists,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.project_weekly_work_items')
            AND constraint_row.conname = 'project_weekly_work_items_title_not_blank'
            AND constraint_row.contype = 'c'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'CHECK (length(TRIM(BOTH FROM title)) > 0)'
        ) AS title_not_blank_check,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.project_weekly_work_items')
            AND constraint_row.conname = 'project_weekly_work_items_completed_state'
            AND constraint_row.contype = 'c'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'CHECK (status = ''done''::text AND completed_at IS NOT NULL OR status <> ''done''::text AND completed_at IS NULL)'
        ) AS completed_state_check,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.project_weekly_work_items')
            AND constraint_row.conname = 'project_weekly_work_items_delete_actor'
            AND constraint_row.contype = 'c'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'CHECK (deleted_at IS NULL AND deleted_by IS NULL OR deleted_at IS NOT NULL AND deleted_by IS NOT NULL)'
        ) AS delete_actor_check,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.project_weekly_work_items')
            AND constraint_row.conname = 'project_weekly_work_items_version_check'
            AND constraint_row.contype = 'c'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) = 'CHECK (version > 0)'
        ) AS version_positive_check,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.project_weekly_work_items')
            AND constraint_row.conname = 'project_weekly_work_items_category_check'
            AND constraint_row.contype = 'c'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'CHECK (category = ANY (ARRAY[''leveling''::text, ''manual''::text, ''other''::text]))'
        ) AS category_check,
        EXISTS (
          SELECT 1
          FROM pg_constraint constraint_row
          WHERE constraint_row.conrelid = to_regclass('public.project_weekly_work_items')
            AND constraint_row.conname = 'project_weekly_work_items_status_check'
            AND constraint_row.contype = 'c'
            AND pg_get_constraintdef(constraint_row.oid, TRUE) =
              'CHECK (status = ANY (ARRAY[''planned''::text, ''in_progress''::text, ''done''::text, ''blocked''::text]))'
        ) AS status_check
    `
  );

  return result.rows[0] ?? {
    category_check: false,
    column_definitions_valid: false,
    completed_state_check: false,
    created_by_fk: false,
    delete_actor_check: false,
    deleted_by_fk: false,
    deny_policy_exists: false,
    id_primary_key: false,
    project_fk: false,
    project_date_index: false,
    present_columns: [],
    rls_enabled: false,
    status_check: false,
    table_exists: false,
    title_not_blank_check: false,
    unique_creator_request: false,
    version_positive_check: false
  };
};

export const evaluateWeeklyWorkCapability = (
  row: CapabilityProbeRow,
  checkedAt = new Date().toISOString()
): WeeklyWorkCapability => {
  const presentColumns = new Set(row.present_columns ?? []);
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !presentColumns.has(column));
  const requiredChecks: Array<[string, boolean]> = [
    ['column_definitions', row.column_definitions_valid],
    ['id_primary_key', row.id_primary_key],
    ['created_by_client_request_id_unique', row.unique_creator_request],
    ['project_fk', row.project_fk],
    ['created_by_fk', row.created_by_fk],
    ['deleted_by_fk', row.deleted_by_fk],
    ['project_date_index', row.project_date_index],
    ['rls_enabled', row.rls_enabled],
    ['legacy_deny_all_policy', row.deny_policy_exists],
    ['title_not_blank_check', row.title_not_blank_check],
    ['completed_state_check', row.completed_state_check],
    ['delete_actor_check', row.delete_actor_check],
    ['version_positive_check', row.version_positive_check],
    ['category_check', row.category_check],
    ['status_check', row.status_check]
  ];
  const missingRequirements = requiredChecks.filter(([, present]) => !present).map(([name]) => name);
  const available = row.table_exists && missingColumns.length === 0 && missingRequirements.length === 0;

  return {
    available,
    checkedAt,
    migration: WEEKLY_WORK_MIGRATION,
    missingColumns,
    missingRequirements,
    reason: available ? 'ready' : row.table_exists ? 'schema_incomplete' : 'migration_missing'
  };
};

export const refreshWeeklyWorkCapability = async (
  probe: CapabilityProbe = defaultProbe
): Promise<WeeklyWorkCapability> => {
  const value = evaluateWeeklyWorkCapability(await probe());
  cachedCapability = {
    expiresAt: Date.now() + CAPABILITY_TTL_MS,
    value
  };
  return value;
};

export const getWeeklyWorkCapability = async (): Promise<WeeklyWorkCapability> => {
  if (cachedCapability && cachedCapability.expiresAt > Date.now()) {
    return cachedCapability.value;
  }

  return refreshWeeklyWorkCapability();
};

export const requireWeeklyWorkCapability = async () => {
  const capability = await getWeeklyWorkCapability();
  if (!capability.available) {
    throw new AppError(
      'Weekly work schema is not ready',
      503,
      'WEEKLY_WORK_SCHEMA_UNAVAILABLE',
      capability
    );
  }

  return capability;
};

export const requiredSchemaCapabilitiesReady = (
  ...capabilities: Array<{ available: boolean }>
) => capabilities.every((capability) => capability.available);

export const resetWeeklyWorkCapabilityCacheForTests = () => {
  cachedCapability = null;
};
