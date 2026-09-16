import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const runnerPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/scripts/run-migrations.ts'
);

test('migration runner serializes executions on one PostgreSQL client', () => {
  const source = readFileSync(runnerPath, 'utf8');

  assert.match(source, /const client = await pool\.connect\(\)/);
  assert.match(source, /pg_advisory_lock\(\$1::bigint\)/);
  assert.match(source, /pg_advisory_unlock\(\$1::bigint\)/);
  assert.match(source, /ensureMigrationsTable\(client\)/);
  assert.match(source, /getAppliedMigrations\(client\)/);
  assert.match(source, /client\.release\(\)/);
  assert.doesNotMatch(source, /pool\.query\(/);
});
