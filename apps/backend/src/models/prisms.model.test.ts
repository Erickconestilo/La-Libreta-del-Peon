import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { buildStationProjectScopeCondition } from './prisms.model.js';

const projectA = '11111111-1111-1111-1111-111111111111';

test('station prism listings reject cross-project prism references', () => {
  const scope = buildStationProjectScopeCondition([projectA], 2);

  assert.match(scope.clause, /s\.project_id = ANY\(\$2::uuid\[\]\)/);
  assert.match(scope.clause, /p\.project_id IS NULL OR p\.project_id = s\.project_id/);
  assert.deepEqual(scope.params, [[projectA]]);
});

test('prism observation reconciliation keeps station and prism in the same project', () => {
  const modelSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../src/models/prisms.model.ts'),
    'utf8'
  );

  assert.match(modelSource, /SELECT id, external_id, name, project_id/);
  assert.match(modelSource, /INNER JOIN prisms p ON p\.id = po\.prism_id/);
  assert.match(modelSource, /ON s\.project_id = p\.project_id/);
  assert.match(modelSource, /AND p\.project_id = \$3/);
  assert.match(modelSource, /candidateCodes\.length === 0 \|\| !station\.project_id/);
  assert.match(modelSource, /AND p\.project_id IS NOT NULL/);
});
