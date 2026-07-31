import assert from 'node:assert/strict';
import test from 'node:test';

import { seedGenericProjectTemplate } from './generic-project-template.js';

test('seeds only neutral sample catalog, control points, and thresholds', async () => {
  const calls: Array<{ params: readonly unknown[] | undefined; sql: string }> = [];
  let pointNumber = 0;
  const client = {
    query: async (sql: string, params?: readonly unknown[]) => {
      calls.push({ params, sql });

      if (sql.includes('RETURNING id')) {
        pointNumber += 1;
        return { rows: [{ id: `point-${pointNumber}` }] };
      }

      return { rows: [] };
    }
  };

  await seedGenericProjectTemplate(client, 'project-1', 'user-1');

  assert.equal(calls.length, 8);
  assert.equal(calls.filter((call) => call.sql.includes('project_code_catalog')).length, 4);
  assert.equal(calls.filter((call) => call.sql.includes('control_points')).length, 2);
  assert.equal(calls.filter((call) => call.sql.includes('control_point_thresholds')).length, 2);
  assert.deepEqual(calls[0].params, ['project-1', 'EJ-N-001', 'Zona Norte', 'blue', 1, 1, 'surface', '0+000']);
  assert.deepEqual(calls[6].params, ['project-1', 'EJ-PIE-01', 'Ejemplo - Punto piezometrico 01', 'surface', '0+050', 'Itinerario de ejemplo 2', 'Zona Sur', 'Datos de muestra. Revise y sustituya estos valores antes de una campana real.']);
  assert.deepEqual(calls[7].params, ['point-2', 'piezometer', 10, 20, 'kPa', 'user-1']);
});
