import { fileURLToPath, pathToFileURL } from 'node:url';

import type { PoolClient } from 'pg';

import { pool } from '../db/pool.js';
import { assertWriteAllowed } from './safety.js';

const SCRIPT_NAME = 'reconcile-applied-migrations';

type ObjectKind = 'table' | 'index' | 'policy' | 'constraint' | 'function' | 'trigger';
type DefinitionKind = 'index' | 'policy' | 'constraint' | 'function' | 'trigger';

interface ExpectedObject {
  kind: ObjectKind;
  name: string;
  parent?: string;
  schema?: string;
}

interface ExpectedColumn {
  table: string;
  name: string;
  type: string;
}

interface ExpectedCatalogRow {
  code: string;
  name: string;
  defaultUnit: string | null;
  isActive: boolean;
}

interface ExpectedMigration {
  filename: string;
  objects: ExpectedObject[];
  columns: ExpectedColumn[];
  catalogRows?: ExpectedCatalogRow[];
  definitions?: ExpectedDefinition[];
}

interface ExpectedDefinition {
  kind: DefinitionKind;
  name: string;
  parent?: string;
  schema?: string;
  alternatives: string[][];
}

interface CatalogRow {
  code: string;
  name: string;
  default_unit: string | null;
  is_active: boolean;
}

interface ObjectPresence {
  expected: ExpectedObject;
  present: boolean;
}

interface ColumnComparison {
  expected: ExpectedColumn;
  present: boolean;
  actualType: string | null;
}

interface CatalogComparison {
  expected: ExpectedCatalogRow;
  present: boolean;
  differences: string[];
  actual: CatalogRow | null;
}

interface MigrationReport {
  migration: ExpectedMigration;
  ledgerPresent: boolean;
  objects: ObjectPresence[];
  columns: ColumnComparison[];
  catalog: CatalogComparison[];
  definitions: DefinitionComparison[];
}

interface DefinitionComparison {
  expected: ExpectedDefinition;
  present: boolean;
  actual: string | null;
}

interface SchemaSnapshot {
  ledgerAvailable: boolean;
  ledger: Set<string>;
  tables: Set<string>;
  indexes: Set<string>;
  policies: Set<string>;
  constraints: Set<string>;
  functions: Set<string>;
  triggers: Set<string>;
  columns: Map<string, Map<string, string>>;
  catalogRows: Map<string, CatalogRow>;
  definitions: Map<string, string>;
}

const table = (name: string): ExpectedObject => ({ kind: 'table', name, schema: 'public' });
const index = (name: string, parent: string): ExpectedObject => ({ kind: 'index', name, parent, schema: 'public' });
const policy = (name: string, parent: string): ExpectedObject => ({ kind: 'policy', name, parent, schema: 'public' });
const constraint = (name: string, parent: string): ExpectedObject => ({ kind: 'constraint', name, parent, schema: 'public' });
const functionObject = (name: string): ExpectedObject => ({ kind: 'function', name, schema: 'public' });
const trigger = (name: string): ExpectedObject => ({ kind: 'trigger', name });
const definition = (
  kind: DefinitionKind,
  name: string,
  alternatives: string[][],
  options: { parent?: string; schema?: string } = {}
): ExpectedDefinition => ({ kind, name, alternatives, ...options });

const columnsFor = (tableName: string, definitions: Array<[string, string]>): ExpectedColumn[] =>
  definitions.map(([name, type]) => ({ table: tableName, name, type }));

const MONITORING_TABLES = [
  'instrument_types',
  'control_points',
  'monitoring_rounds',
  'monitoring_round_points',
  'instrument_readings',
  'reading_attachments',
  'control_point_thresholds',
  'project_code_catalog',
  'project_rules'
];

const MONITORING_019_COLUMNS: ExpectedColumn[] = [
  ...columnsFor('instrument_types', [
    ['code', 'text'],
    ['name', 'text'],
    ['default_unit', 'text'],
    ['is_active', 'boolean'],
    ['created_at', 'timestamp with time zone']
  ]),
  ...columnsFor('control_points', [
    ['id', 'uuid'],
    ['project_id', 'uuid'],
    ['code', 'text'],
    ['name', 'text'],
    ['environment', 'text'],
    ['pk', 'text'],
    ['tramo', 'text'],
    ['zona', 'text'],
    ['seccion', 'text'],
    ['side', 'text'],
    ['notes', 'text'],
    ['is_active', 'boolean'],
    ['created_at', 'timestamp with time zone'],
    ['updated_at', 'timestamp with time zone']
  ]),
  ...columnsFor('monitoring_rounds', [
    ['id', 'uuid'],
    ['project_id', 'uuid'],
    ['name', 'text'],
    ['round_date', 'date'],
    ['status', 'text'],
    ['operator_id', 'uuid'],
    ['instrument_serial', 'text'],
    ['field_conditions', 'text'],
    ['created_by', 'uuid'],
    ['created_at', 'timestamp with time zone'],
    ['updated_at', 'timestamp with time zone']
  ]),
  ...columnsFor('monitoring_round_points', [
    ['id', 'uuid'],
    ['round_id', 'uuid'],
    ['control_point_id', 'uuid'],
    ['expected_instrument_type', 'text'],
    ['status', 'text'],
    ['sort_order', 'integer'],
    ['notes', 'text'],
    ['created_at', 'timestamp with time zone'],
    ['updated_at', 'timestamp with time zone']
  ]),
  ...columnsFor('instrument_readings', [
    ['id', 'uuid'],
    ['round_point_id', 'uuid'],
    ['control_point_id', 'uuid'],
    ['instrument_type', 'text'],
    ['reading_status', 'text'],
    ['client_request_id', 'uuid'],
    ['value_numeric', 'double precision'],
    ['value_text', 'text'],
    ['unit', 'text'],
    ['measured_at', 'timestamp with time zone'],
    ['measured_by', 'uuid'],
    ['notes', 'text'],
    ['raw_payload', 'jsonb'],
    ['created_at', 'timestamp with time zone'],
    ['updated_at', 'timestamp with time zone']
  ]),
  ...columnsFor('reading_attachments', [
    ['id', 'uuid'],
    ['reading_id', 'uuid'],
    ['storage_path', 'text'],
    ['public_url', 'text'],
    ['attachment_type', 'text'],
    ['title', 'text'],
    ['notes', 'text'],
    ['uploaded_by', 'uuid'],
    ['uploaded_at', 'timestamp with time zone']
  ]),
  ...columnsFor('control_point_thresholds', [
    ['id', 'uuid'],
    ['control_point_id', 'uuid'],
    ['instrument_type', 'text'],
    ['warning_value', 'double precision'],
    ['alarm_value', 'double precision'],
    ['unit', 'text'],
    ['valid_from', 'timestamp with time zone'],
    ['valid_to', 'timestamp with time zone'],
    ['created_by', 'uuid'],
    ['created_at', 'timestamp with time zone'],
    ['updated_at', 'timestamp with time zone']
  ]),
  ...columnsFor('project_code_catalog', [
    ['id', 'uuid'],
    ['project_id', 'uuid'],
    ['code', 'text'],
    ['zone', 'text'],
    ['zone_color', 'text'],
    ['itinerary_number', 'integer'],
    ['itinerary_order', 'integer'],
    ['environment', 'text'],
    ['pk', 'text'],
    ['is_active', 'boolean'],
    ['created_at', 'timestamp with time zone']
  ]),
  ...columnsFor('project_rules', [
    ['id', 'uuid'],
    ['project_id', 'uuid'],
    ['rule_type', 'text'],
    ['value', 'text'],
    ['configured_by', 'uuid'],
    ['created_at', 'timestamp with time zone']
  ])
];

const EXPECTED_024_CATALOG: ExpectedCatalogRow[] = [
  { code: 'fissure_witness', name: 'Fisurómetro testigo (foto)', defaultUnit: null, isActive: true },
  { code: 'fissure_gauge', name: 'Fisurómetro digital', defaultUnit: 'mm', isActive: true },
  { code: 'potentiometer', name: 'Potenciómetro', defaultUnit: 'kOhm', isActive: true },
  { code: 'clinometer', name: 'Clinómetro', defaultUnit: 'deg', isActive: true },
  { code: 'convergence_tape', name: 'Cinta de convergencia', defaultUnit: 'mm', isActive: true }
];

const DENY_ALL_POLICY_ALTERNATIVES = [
  ['command=all', 'roles=anon,authenticated', 'using=false', 'check=false', 'rls=true'],
  ['command=all', 'roles=authenticated,anon', 'using=false', 'check=false', 'rls=true']
];

const HANDLE_NEW_AUTH_USER_025_FRAGMENTS = [
  'create or replace function public.handle_new_auth_user()',
  'returns trigger',
  'language plpgsql',
  'security definer',
  'set search_path',
  "nullif(lower(new.raw_user_meta_data ->> 'role'), '')",
  "nullif(lower(new.raw_app_meta_data ->> 'role'), '')",
  "v_role not in ('admin', 'topografo', 'visitante')",
  'v_full_name := coalesce',
  "split_part(new.email, '@', 1)",
  'insert into public.users',
  'on conflict (id) do nothing',
  'return new'
];

const HANDLE_NEW_AUTH_USER_026_FRAGMENTS = [
  'create or replace function public.handle_new_auth_user()',
  'returns trigger',
  'language plpgsql',
  'security definer',
  'set search_path',
  "nullif(lower(new.raw_user_meta_data ->> 'role'), '')",
  "nullif(lower(new.raw_app_meta_data ->> 'role'), '')",
  "v_role not in ('admin', 'topografo', 'supervisor', 'visitante')",
  'v_full_name := coalesce',
  "split_part(new.email, '@', 1)",
  'insert into public.users',
  'on conflict (id) do nothing',
  'return new'
];

const EXPECTED_MIGRATIONS: ExpectedMigration[] = [
  {
    filename: '019_monitoring_rounds.sql',
    objects: [
      ...MONITORING_TABLES.map(table),
      index('idx_control_points_project', 'control_points'),
      index('idx_rounds_project_status', 'monitoring_rounds'),
      index('idx_round_points_round_status', 'monitoring_round_points'),
      index('idx_readings_round_point', 'instrument_readings'),
      index('idx_readings_control_point_history', 'instrument_readings'),
      index('idx_attachments_reading', 'reading_attachments'),
      index('idx_thresholds_point_type_date', 'control_point_thresholds'),
      index('idx_code_catalog_project_zone', 'project_code_catalog')
    ],
    columns: MONITORING_019_COLUMNS
  },
  {
    filename: '020_monitoring_rounds_rls.sql',
    objects: MONITORING_TABLES.map((tableName) => policy('legacy deny all', tableName)),
    columns: [],
    definitions: MONITORING_TABLES.map((tableName) => definition(
      'policy',
      'legacy deny all',
      DENY_ALL_POLICY_ALTERNATIVES,
      { parent: tableName, schema: 'public' }
    ))
  },
  {
    filename: '021_monitoring_round_assignment_order.sql',
    objects: [index('idx_monitoring_rounds_operator_queue', 'monitoring_rounds')],
    columns: [{ table: 'monitoring_rounds', name: 'execution_order', type: 'integer' }],
    definitions: [definition(
      'index',
      'idx_monitoring_rounds_operator_queue',
      [[
        'on public.monitoring_rounds using btree (operator_id, round_date, execution_order, created_at)',
        "status = any (array['draft'::text, 'active'::text])"
      ]],
      { parent: 'monitoring_rounds', schema: 'public' }
    )]
  },
  {
    filename: '022_project_membership_access_level.sql',
    objects: [
      index('idx_project_memberships_project_access', 'project_memberships'),
      constraint('project_memberships_access_level_check', 'project_memberships')
    ],
    columns: [{ table: 'project_memberships', name: 'access_level', type: 'text' }],
    definitions: [definition(
      'constraint',
      'project_memberships_access_level_check',
      [["access_level = any (array['read'::text, 'write'::text])"]],
      { parent: 'project_memberships', schema: 'public' }
    )]
  },
  {
    filename: '023_work_completion_reports.sql',
    objects: [
      table('work_completion_reports'),
      index('idx_work_completion_reports_round', 'work_completion_reports'),
      index('idx_work_completion_reports_project_date', 'work_completion_reports'),
      policy('legacy deny all', 'work_completion_reports')
    ],
    columns: columnsFor('work_completion_reports', [
      ['id', 'uuid'],
      ['round_id', 'uuid'],
      ['project_id', 'uuid'],
      ['zone_label', 'text'],
      ['status', 'text'],
      ['completed_point_count', 'integer'],
      ['pending_point_count', 'integer'],
      ['pending_reasons', 'jsonb'],
      ['notes', 'text'],
      ['reported_by', 'uuid'],
      ['reported_at', 'timestamp with time zone'],
      ['client_request_id', 'uuid'],
      ['created_at', 'timestamp with time zone']
    ]),
    definitions: [definition(
      'policy',
      'legacy deny all',
      DENY_ALL_POLICY_ALTERNATIVES,
      { parent: 'work_completion_reports', schema: 'public' }
    )]
  },
  {
    filename: '024_field_instrument_catalog.sql',
    objects: [],
    columns: [],
    catalogRows: EXPECTED_024_CATALOG
  },
  {
    filename: '025_fix_auth_user_trigger_users.sql',
    objects: [functionObject('handle_new_auth_user'), trigger('on_auth_user_created')],
    columns: [],
    definitions: [
      definition(
        'function',
        'handle_new_auth_user',
        [HANDLE_NEW_AUTH_USER_025_FRAGMENTS, HANDLE_NEW_AUTH_USER_026_FRAGMENTS],
        { schema: 'public' }
      ),
      definition(
        'trigger',
        'on_auth_user_created',
        [
          [
            'create trigger on_auth_user_created',
            'after insert on auth.users',
            'for each row execute function public.handle_new_auth_user()'
          ],
          [
            'create trigger on_auth_user_created',
            'after insert on auth.users',
            'for each row execute function handle_new_auth_user()'
          ]
        ]
      )
    ]
  },
  {
    filename: '026_supervisor_role.sql',
    objects: [constraint('users_role_check', 'users'), functionObject('handle_new_auth_user')],
    columns: [],
    definitions: [
      definition(
        'constraint',
        'users_role_check',
        [["role = any (array['admin'::text, 'topografo'::text, 'supervisor'::text, 'visitante'::text])"]],
        { parent: 'users', schema: 'public' }
      ),
      definition(
        'function',
        'handle_new_auth_user',
        [HANDLE_NEW_AUTH_USER_026_FRAGMENTS],
        { schema: 'public' }
      )
    ]
  }
];

const normalizeType = (type: string): string => type.replace(/\s+/g, ' ').trim().toLowerCase();
const normalizeDefinition = (value: string): string => value.replace(/\s+/g, ' ').trim().toLowerCase();

const objectKey = (object: ExpectedObject): string =>
  [object.kind, object.schema ?? '', object.parent ?? '', object.name].join(':');

const objectSetKey = (kind: ObjectKind, schema: string, parent: string, name: string): string =>
  [kind, schema, parent, name].join(':');

const getExpectedTableNames = (): string[] =>
  [...new Set(EXPECTED_MIGRATIONS.flatMap((migration) => [
    ...migration.objects.filter((object) => object.kind === 'table').map((object) => object.name),
    ...migration.columns.map((column) => column.table),
    ...(migration.catalogRows ? ['instrument_types'] : [])
  ]))];

const getExpectedIndexNames = (): string[] =>
  [...new Set(EXPECTED_MIGRATIONS.flatMap((migration) =>
    migration.objects.filter((object) => object.kind === 'index').map((object) => object.name)))];

const getExpectedPolicyNames = (): string[] =>
  [...new Set(EXPECTED_MIGRATIONS.flatMap((migration) =>
    migration.objects.filter((object) => object.kind === 'policy').map((object) => object.name)))];

const getExpectedConstraintNames = (): string[] =>
  [...new Set(EXPECTED_MIGRATIONS.flatMap((migration) =>
    migration.objects.filter((object) => object.kind === 'constraint').map((object) => object.name)))];

const getExpectedFunctionNames = (): string[] =>
  [...new Set(EXPECTED_MIGRATIONS.flatMap((migration) =>
    migration.objects.filter((object) => object.kind === 'function').map((object) => object.name)))];

const getExpectedTriggerNames = (): string[] =>
  [...new Set(EXPECTED_MIGRATIONS.flatMap((migration) =>
    migration.objects.filter((object) => object.kind === 'trigger').map((object) => object.name)))];

const definitionKey = (definition: Pick<ExpectedDefinition, 'kind' | 'schema' | 'parent' | 'name'>): string =>
  [definition.kind, definition.schema ?? '', definition.parent ?? '', definition.name].join(':');

const definitionMatches = (actual: string | null, expected: ExpectedDefinition): boolean => {
  if (!actual) return false;
  const normalizedActual = normalizeDefinition(actual);
  return expected.alternatives.some((fragments) =>
    fragments.every((fragment) => normalizedActual.includes(normalizeDefinition(fragment))));
};

const loadSnapshot = async (client: PoolClient): Promise<SchemaSnapshot> => {
  const tableNames = getExpectedTableNames();
  const indexNames = getExpectedIndexNames();
  const policyNames = getExpectedPolicyNames();
  const constraintNames = getExpectedConstraintNames();
  const functionNames = getExpectedFunctionNames();
  const triggerNames = getExpectedTriggerNames();

  const ledgerTableResult = await client.query<{ exists: boolean }>(
    `SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists`
  );
  const ledgerAvailable = ledgerTableResult.rows[0]?.exists === true;

  const ledgerResult = ledgerAvailable
    ? await client.query<{ filename: string }>(
        `SELECT filename FROM public.schema_migrations WHERE filename = ANY($1::text[])`,
        [EXPECTED_MIGRATIONS.map((migration) => migration.filename)]
      )
    : { rows: [] as Array<{ filename: string }> };
  const tableResult = await client.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
       AND table_name = ANY($1::text[])`,
    [tableNames]
  );
  const columnResult = await client.query<{ table_name: string; column_name: string; data_type: string }>(
    `SELECT c.table_name, c.column_name, format_type(a.atttypid, a.atttypmod) AS data_type
     FROM information_schema.columns c
     JOIN pg_namespace n ON n.nspname = c.table_schema
     JOIN pg_class pc ON pc.relnamespace = n.oid AND pc.relname = c.table_name
     JOIN pg_attribute a ON a.attrelid = pc.oid AND a.attname = c.column_name
     WHERE c.table_schema = 'public'
       AND c.table_name = ANY($1::text[])
       AND a.attnum > 0
       AND NOT a.attisdropped`,
    [tableNames]
  );
  const indexResult = await client.query<{ tablename: string; indexname: string; definition: string }>(
    `SELECT tablename, indexname, indexdef AS definition
     FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname = ANY($1::text[])`,
    [indexNames]
  );
  const policyResult = await client.query<{
    tablename: string;
    policyname: string;
    definition: string;
  }>(
    `SELECT p.tablename,
            p.policyname,
            concat(
              'command=', lower(p.cmd),
              ';roles=', array_to_string(p.roles, ','),
              ';using=', regexp_replace(coalesce(p.qual, ''), '[()[:space:]]', '', 'g'),
              ';check=', regexp_replace(coalesce(p.with_check, ''), '[()[:space:]]', '', 'g'),
              ';rls=', c.relrowsecurity::text
            ) AS definition
     FROM pg_policies p
     JOIN pg_class c ON c.relname = p.tablename
     JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
     WHERE p.schemaname = 'public'
       AND p.policyname = ANY($1::text[])`,
    [policyNames]
  );
  const constraintResult = await client.query<{ schema_name: string; table_name: string; constraint_name: string; definition: string }>(
    `SELECT n.nspname AS schema_name,
            c.relname AS table_name,
            con.conname AS constraint_name,
            pg_get_constraintdef(con.oid, true) AS definition
     FROM pg_constraint con
     JOIN pg_class c ON c.oid = con.conrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND con.conname = ANY($1::text[])`,
    [constraintNames]
  );
  const functionResult = await client.query<{ schema_name: string; function_name: string; definition: string }>(
    `SELECT n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_functiondef(p.oid) AS definition
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = ANY($1::text[])`,
    [functionNames]
  );
  const triggerResult = await client.query<{ schema_name: string; table_name: string; trigger_name: string; definition: string }>(
    `SELECT n.nspname AS schema_name,
            c.relname AS table_name,
            t.tgname AS trigger_name,
            pg_get_triggerdef(t.oid, true) AS definition
     FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE NOT t.tgisinternal
       AND t.tgname = ANY($1::text[])`,
    [triggerNames]
  );

  const tables = new Set(tableResult.rows.map((row) => row.table_name));
  const indexes = new Set(indexResult.rows.map((row) =>
    objectSetKey('index', 'public', row.tablename, row.indexname)));
  const policies = new Set(policyResult.rows.map((row) =>
    objectSetKey('policy', 'public', row.tablename, row.policyname)));
  const constraints = new Set(constraintResult.rows.map((row) =>
    objectSetKey('constraint', row.schema_name, row.table_name, row.constraint_name)));
  const functions = new Set(functionResult.rows.map((row) =>
    objectSetKey('function', row.schema_name, '', row.function_name)));
  const triggers = new Set(triggerResult.rows.map((row) =>
    objectSetKey('trigger', row.schema_name, row.table_name, row.trigger_name)));
  const columns = new Map<string, Map<string, string>>();

  for (const row of columnResult.rows) {
    const tableColumns = columns.get(row.table_name) ?? new Map<string, string>();
    tableColumns.set(row.column_name, normalizeType(row.data_type));
    columns.set(row.table_name, tableColumns);
  }

  const catalogRows = new Map<string, CatalogRow>();
  if (tables.has('instrument_types')) {
    const catalogResult = await client.query<CatalogRow>(
      `SELECT code, name, default_unit, is_active
       FROM public.instrument_types
       WHERE code = ANY($1::text[])`,
      [EXPECTED_024_CATALOG.map((row) => row.code)]
    );
    for (const row of catalogResult.rows) {
      catalogRows.set(row.code, row);
    }
  }

  const definitions = new Map<string, string>();
  for (const row of indexResult.rows) {
    definitions.set(definitionKey({ kind: 'index', schema: 'public', parent: row.tablename, name: row.indexname }), row.definition);
  }
  for (const row of policyResult.rows) {
    definitions.set(definitionKey({ kind: 'policy', schema: 'public', parent: row.tablename, name: row.policyname }), row.definition);
  }
  for (const row of constraintResult.rows) {
    definitions.set(definitionKey({ kind: 'constraint', schema: row.schema_name, parent: row.table_name, name: row.constraint_name }), row.definition);
  }
  for (const row of functionResult.rows) {
    definitions.set(definitionKey({ kind: 'function', schema: row.schema_name, name: row.function_name }), row.definition);
  }
  for (const row of triggerResult.rows) {
    definitions.set(definitionKey({ kind: 'trigger', name: row.trigger_name }), row.definition);
  }

  return {
    ledgerAvailable,
    ledger: new Set(ledgerResult.rows.map((row) => row.filename)),
    tables,
    indexes,
    policies,
    constraints,
    functions,
    triggers,
    columns,
    catalogRows,
    definitions
  };
};

const isObjectPresent = (snapshot: SchemaSnapshot, expected: ExpectedObject): boolean => {
  switch (expected.kind) {
    case 'table':
      return snapshot.tables.has(expected.name);
    case 'index':
      return snapshot.indexes.has(objectKey(expected));
    case 'policy':
      return snapshot.policies.has(objectKey(expected));
    case 'constraint':
      return snapshot.constraints.has(objectKey(expected));
    case 'function':
      return snapshot.functions.has(objectKey(expected));
    case 'trigger':
      return [...snapshot.triggers].some((key) => key.endsWith(`:${expected.name}`));
  }
};

const compareCatalogFields = (expectedRows: ExpectedCatalogRow[], actualRows: Map<string, CatalogRow>): CatalogComparison[] =>
  expectedRows.map((expected) => {
    const actual = actualRows.get(expected.code) ?? null;
    if (!actual) {
      return { expected, present: false, differences: [], actual };
    }

    const differences: string[] = [];
    if (actual.name !== expected.name) {
      differences.push(`name esperado=${JSON.stringify(expected.name)} actual=${JSON.stringify(actual.name)}`);
    }
    if (actual.default_unit !== expected.defaultUnit) {
      differences.push(`default_unit esperado=${JSON.stringify(expected.defaultUnit)} actual=${JSON.stringify(actual.default_unit)}`);
    }
    if (actual.is_active !== expected.isActive) {
      differences.push(`is_active esperado=${expected.isActive} actual=${actual.is_active}`);
    }

    return { expected, present: true, differences, actual };
  });

const buildReports = (snapshot: SchemaSnapshot): MigrationReport[] =>
  EXPECTED_MIGRATIONS.map((migration) => ({
    migration,
    ledgerPresent: snapshot.ledger.has(migration.filename),
    objects: migration.objects.map((expected) => ({ expected, present: isObjectPresent(snapshot, expected) })),
    columns: migration.columns.map((expected) => {
      const actualType = snapshot.columns.get(expected.table)?.get(expected.name) ?? null;
      return {
        expected,
        present: actualType !== null && actualType === normalizeType(expected.type),
        actualType
      };
    }),
    catalog: migration.catalogRows ? compareCatalogFields(migration.catalogRows, snapshot.catalogRows) : [],
    definitions: (migration.definitions ?? []).map((expected) => {
      const actual = snapshot.definitions.get(definitionKey(expected)) ?? null;
      return { expected, actual, present: definitionMatches(actual, expected) };
    })
  }));

const migrationIsStructurallyReady = (report: MigrationReport): boolean =>
  report.objects.every((object) => object.present)
  && report.columns.every((column) => column.present)
  && report.catalog.every((row) => row.present && row.differences.length === 0)
  && report.definitions.every((definition) => definition.present);

const printReports = (snapshot: SchemaSnapshot, reports: MigrationReport[], writeMode: boolean) => {
  console.log('=== RECONCILIACIÓN DE MIGRACIONES 019-026 ===');
  console.log(`Modo: ${writeMode ? 'WRITE (solo ledger, con --write)' : 'DRY-RUN (solo lectura)'}`);
  console.log('No se leen ni ejecutan los SQL de las migraciones.');
  console.log(`Ledger public.schema_migrations: ${snapshot.ledgerAvailable ? 'disponible' : 'NO DISPONIBLE'}`);
  console.log();

  for (const report of reports) {
    const missingObjects = report.objects
      .filter((object) => !object.present)
      .map((object) => `${object.expected.kind}:${object.expected.parent ? `${object.expected.parent}.` : ''}${object.expected.name}`);
    const mismatchedColumns = report.columns
      .filter((column) => !column.present)
      .map((column) => `${column.expected.table}.${column.expected.name} esperado=${column.expected.type} actual=${column.actualType ?? 'AUSENTE'}`);
    const missingCatalog = report.catalog.filter((row) => !row.present).map((row) => row.expected.code);
    const catalogDifferences = report.catalog.flatMap((row) =>
      row.differences.map((difference) => `${row.expected.code}: ${difference}`));
    const definitionDifferences = report.definitions
      .filter((definition) => !definition.present)
      .map((definition) => `${definition.expected.kind}:${definition.expected.parent ? `${definition.expected.parent}.` : ''}${definition.expected.name}`);
    const ready = migrationIsStructurallyReady(report);

    console.log(`--- ${report.migration.filename} ---`);
    console.log(`ledger: ${report.ledgerPresent ? 'PRESENTE' : 'AUSENTE'}`);
    console.log(`objetos: ${missingObjects.length === 0 ? 'OK' : `FALTAN ${missingObjects.join(', ')}`}`);
    console.log(`columnas: ${mismatchedColumns.length === 0 ? 'OK' : `DIFERENCIAS ${mismatchedColumns.join('; ')}`}`);
    if (report.catalog.length > 0) {
      console.log(`024 códigos: ${missingCatalog.length === 0 ? 'OK' : `FALTAN ${missingCatalog.join(', ')}`}`);
      if (catalogDifferences.length > 0) {
        console.log(`024 diferencias de campos: ${catalogDifferences.join('; ')}`);
      } else {
        console.log('024 campos name/default_unit/is_active: OK');
      }
    }
    if (report.definitions.length > 0) {
      console.log(`definiciones: ${definitionDifferences.length === 0 ? 'OK' : `DIFERENCIAS ${definitionDifferences.join(', ')}`}`);
    }
    console.log(`registro elegible: ${ready ? 'SÍ' : 'NO'}`);
  }

  const pending = reports.filter((report) => !report.ledgerPresent && migrationIsStructurallyReady(report));
  console.log();
  console.log(`Migraciones aplicadas funcionalmente listas para registrar: ${pending.length}`);
  console.log(`Candidatas: ${pending.length > 0 ? pending.map((report) => report.migration.filename).join(', ') : 'ninguna'}`);
  if (!writeMode) {
    console.log('DRY-RUN: no se escribirá ninguna fila en schema_migrations.');
  }
};

const registerReports = async (client: PoolClient, snapshot: SchemaSnapshot, reports: MigrationReport[]) => {
  if (!snapshot.ledgerAvailable) {
    throw new Error('Cannot register migrations because public.schema_migrations is unavailable');
  }

  const pending = reports.filter((report) => !report.ledgerPresent && migrationIsStructurallyReady(report));
  await client.query('BEGIN');
  try {
    for (const report of pending) {
      await client.query(
        `INSERT INTO public.schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING`,
        [report.migration.filename]
      );
    }
    await client.query('COMMIT');
    console.log(`Filas registradas en schema_migrations: ${pending.length}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

const parseWriteMode = (): boolean => {
  const argumentsList = process.argv.slice(2);
  const unknownArguments = argumentsList.filter((argument) => argument !== '--write');
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArguments.join(', ')}. Use --write only when explicitly authorized.`);
  }
  return argumentsList.includes('--write');
};

export {
  EXPECTED_MIGRATIONS,
  compareCatalogFields,
  definitionMatches,
  buildReports,
  migrationIsStructurallyReady
};

const main = async () => {
  const writeMode = parseWriteMode();
  if (writeMode) {
    assertWriteAllowed(SCRIPT_NAME);
  }

  const client = await pool.connect();
  try {
    const snapshot = await loadSnapshot(client);
    const reports = buildReports(snapshot);
    printReports(snapshot, reports, writeMode);
    if (writeMode) {
      await registerReports(client, snapshot, reports);
    }
  } finally {
    client.release();
    await pool.end();
  }
};

const invokedFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : null;
const currentFile = fileURLToPath(import.meta.url);

if (invokedFile === currentFile) {
  main().catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
}
