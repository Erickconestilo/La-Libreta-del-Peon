import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { parseProjectCodeCatalogCsv } from './project-code-catalog-csv.js';

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../data/generic-project-code-catalog.csv'
);

test('generic catalog fixture stays neutral and follows the import contract', () => {
  const csv = readFileSync(fixturePath, 'utf8');
  const rows = parseProjectCodeCatalogCsv(csv);

  assert.deepEqual(
    rows.map((row) => row.code),
    ['EJ-N-001', 'EJ-N-002', 'EJ-S-001', 'EJ-S-002', 'EJ-C-001']
  );
  assert.deepEqual(
    rows.map((row) => row.zone),
    ['Zona Norte', 'Zona Norte', 'Zona Sur', 'Zona Sur', 'Zona Centro']
  );
  assert.ok(rows.every((row) => /^EJ-[A-Z]-\d{3}$/.test(row.code)));
  assert.ok(rows.every((row) => ['surface'].includes(row.environment ?? '')));
  assert.equal(csv.includes('Campus Nord'), false);
  assert.equal(csv.includes('L8'), false);
  assert.equal(csv.includes('Sant Gervasi'), false);
});
