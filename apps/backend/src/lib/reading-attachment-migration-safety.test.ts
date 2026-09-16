import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../../migrations/028_reading_attachment_idempotency.sql', import.meta.url),
  'utf8'
);

test('reading attachment idempotency migration refuses historical duplicates and adds a unique index', () => {
  assert.match(migration, /GROUP BY reading_id, storage_path/);
  assert.match(migration, /RAISE EXCEPTION/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_reading_attachments_reading_storage/);
  assert.doesNotMatch(migration, /DELETE\s+FROM/i);
  assert.doesNotMatch(migration, /UPDATE\s+reading_attachments/i);
});
