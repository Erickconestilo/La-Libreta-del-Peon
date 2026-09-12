import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const migrationPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../migrations/027_station_mounting_visits.sql'
);

test('mounting visits migration keeps tenant integrity and deny-all RLS', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_stations_id_project_id/);
  assert.match(sql, /station_mounting_visits_station_project_fk/);
  assert.match(sql, /FOREIGN KEY \(station_id, project_id\)/);
  assert.match(sql, /mounting_visit_evidence_visit_station_fk/);
  assert.match(sql, /FOREIGN KEY \(visit_id, station_id\)/);
  assert.match(sql, /ALTER TABLE station_mounting_visits ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /ALTER TABLE mounting_visit_evidence ENABLE ROW LEVEL SECURITY/);
  assert.equal(sql.includes('Campus Nord'), false);
  assert.equal(sql.includes('L8'), false);
});
