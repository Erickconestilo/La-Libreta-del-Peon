import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareCatalogFields,
  definitionMatches,
  EXPECTED_MIGRATIONS,
  migrationIsStructurallyReady
} from './reconcile-applied-migrations.js';

test('reconciliation catalog comparison reports field drift without changing values', () => {
  const expected = EXPECTED_MIGRATIONS.find((migration) => migration.filename === '024_field_instrument_catalog.sql');
  assert.ok(expected?.catalogRows);

  const actualRows = new Map([
    ['fissure_witness', {
      code: 'fissure_witness',
      name: 'Nombre local',
      default_unit: null,
      is_active: false
    }]
  ]);

  const comparison = compareCatalogFields(expected.catalogRows, actualRows);
  const changed = comparison.find((row) => row.expected.code === 'fissure_witness');

  assert.deepEqual(changed?.differences, [
    'name esperado="Fisurómetro testigo (foto)" actual="Nombre local"',
    'is_active esperado=true actual=false'
  ]);
  assert.equal(changed?.actual?.name, 'Nombre local');
  assert.equal(changed?.actual?.is_active, false);
});

test('a migration with missing objects or columns is not eligible for ledger registration', () => {
  const migration = EXPECTED_MIGRATIONS.find((item) => item.filename === '021_monitoring_round_assignment_order.sql');
  assert.ok(migration);

  const report = {
    migration,
    ledgerPresent: false,
    objects: migration.objects.map((expected) => ({ expected, present: true })),
    columns: migration.columns.map((expected) => ({ expected, present: false, actualType: null })),
    catalog: [],
    definitions: []
  };

  assert.equal(migrationIsStructurallyReady(report), false);
});

test('policy equivalence requires deny-all roles, expressions, and RLS enabled', () => {
  const migration = EXPECTED_MIGRATIONS.find((item) => item.filename === '020_monitoring_rounds_rls.sql');
  const expected = migration?.definitions?.[0];
  assert.ok(expected);

  assert.equal(
    definitionMatches('command=all;roles=anon,authenticated;using=false;check=false;rls=true', expected),
    true
  );
  assert.equal(
    definitionMatches('command=all;roles=anon,authenticated;using=true;check=false;rls=true', expected),
    false
  );
  assert.equal(
    definitionMatches('command=all;roles=authenticated;using=false;check=false;rls=true', expected),
    false
  );
  assert.equal(
    definitionMatches('command=all;roles=anon,authenticated;using=false;check=false;rls=false', expected),
    false
  );
});

test('021 index equivalence rejects a different queue predicate', () => {
  const migration = EXPECTED_MIGRATIONS.find((item) => item.filename === '021_monitoring_round_assignment_order.sql');
  const expected = migration?.definitions?.[0];
  assert.ok(expected);

  const correct = `
    CREATE INDEX idx_monitoring_rounds_operator_queue
    ON public.monitoring_rounds USING btree (operator_id, round_date, execution_order, created_at)
    WHERE (status = ANY (ARRAY['draft'::text, 'active'::text]))
  `;
  const drifted = correct.replace("'active'::text", "'closed'::text");

  assert.equal(definitionMatches(correct, expected), true);
  assert.equal(definitionMatches(drifted, expected), false);
});

test('022 and 026 constraints require their exact allowed role/access sets', () => {
  const membership = EXPECTED_MIGRATIONS
    .find((item) => item.filename === '022_project_membership_access_level.sql')
    ?.definitions?.[0];
  const role = EXPECTED_MIGRATIONS
    .find((item) => item.filename === '026_supervisor_role.sql')
    ?.definitions?.[0];
  assert.ok(membership);
  assert.ok(role);

  assert.equal(definitionMatches("CHECK ((access_level = ANY (ARRAY['read'::text, 'write'::text])))", membership), true);
  assert.equal(definitionMatches("CHECK ((access_level = ANY (ARRAY['write'::text])))", membership), false);
  assert.equal(
    definitionMatches("CHECK ((role = ANY (ARRAY['admin'::text, 'topografo'::text, 'supervisor'::text, 'visitante'::text])))", role),
    true
  );
  assert.equal(
    definitionMatches("CHECK ((role = ANY (ARRAY['admin'::text, 'topografo'::text, 'visitante'::text])))", role),
    false
  );
});

test('025 accepts its function or the 026 superseding function, while 026 requires supervisor support', () => {
  const migration025 = EXPECTED_MIGRATIONS.find((item) => item.filename === '025_fix_auth_user_trigger_users.sql');
  const migration026 = EXPECTED_MIGRATIONS.find((item) => item.filename === '026_supervisor_role.sql');
  const function025 = migration025?.definitions?.find((item) => item.kind === 'function');
  const function026 = migration026?.definitions?.find((item) => item.kind === 'function');
  assert.ok(function025);
  assert.ok(function026);

  const base = `
    CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public
    AS $function$
    BEGIN
      v_role := COALESCE(
        NULLIF(lower(new.raw_user_meta_data ->> 'role'), ''),
        NULLIF(lower(new.raw_app_meta_data ->> 'role'), ''),
        'topografo'
      );
      IF v_role NOT IN (ROLES) THEN v_role := 'topografo'; END IF;
      v_full_name := COALESCE(NULLIF(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1));
      INSERT INTO public.users VALUES (new.id) ON CONFLICT (id) DO NOTHING;
      RETURN new;
    END;
    $function$
  `;
  const original025 = base.replace('ROLES', "'admin', 'topografo', 'visitante'");
  const superseding026 = base.replace('ROLES', "'admin', 'topografo', 'supervisor', 'visitante'");

  assert.equal(definitionMatches(original025, function025), true);
  assert.equal(definitionMatches(superseding026, function025), true);
  assert.equal(definitionMatches(original025, function026), false);
  assert.equal(definitionMatches(superseding026, function026), true);
});

test('025 trigger equivalence rejects a trigger on the wrong auth event', () => {
  const expected = EXPECTED_MIGRATIONS
    .find((item) => item.filename === '025_fix_auth_user_trigger_users.sql')
    ?.definitions?.find((item) => item.kind === 'trigger');
  assert.ok(expected);

  const correct = 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user()';
  const drifted = 'CREATE TRIGGER on_auth_user_created AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user()';
  assert.equal(definitionMatches(correct, expected), true);
  assert.equal(definitionMatches(drifted, expected), false);
});

test('semantic definition drift makes a migration ineligible', () => {
  const migration = EXPECTED_MIGRATIONS.find((item) => item.filename === '023_work_completion_reports.sql');
  assert.ok(migration);

  const report = {
    migration,
    ledgerPresent: false,
    objects: migration.objects.map((expected) => ({ expected, present: true })),
    columns: migration.columns.map((expected) => ({ expected, present: true, actualType: expected.type })),
    catalog: [],
    definitions: (migration.definitions ?? []).map((expected) => ({
      expected,
      present: false,
      actual: 'command=all;roles=anon,authenticated;using=true;check=false;rls=true'
    }))
  };

  assert.equal(migrationIsStructurallyReady(report), false);
});

test('catalog field drift also makes 024 ineligible', () => {
  const migration = EXPECTED_MIGRATIONS.find((item) => item.filename === '024_field_instrument_catalog.sql');
  assert.ok(migration?.catalogRows);
  const catalog = compareCatalogFields(migration.catalogRows, new Map(migration.catalogRows.map((row) => [row.code, {
    code: row.code,
    name: row.name,
    default_unit: row.defaultUnit,
    is_active: row.code === 'fissure_witness' ? false : row.isActive
  }])));

  const report = {
    migration,
    ledgerPresent: false,
    objects: [],
    columns: [],
    catalog,
    definitions: []
  };

  assert.equal(migrationIsStructurallyReady(report), false);
});
