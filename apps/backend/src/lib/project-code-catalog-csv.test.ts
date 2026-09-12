import assert from 'node:assert/strict';
import test from 'node:test';

import { parseProjectCodeCatalogCsv } from './project-code-catalog-csv.js';

test('parses project code catalog CSV rows in itinerary order', () => {
  const rows = parseProjectCodeCatalogCsv(`code,zone,zone_color,itinerary_number,itinerary_order,environment,pk
EJ-T-002,Zona Norte,blue,1,2,tunnel,PK 1+020
EJ-T-001,Zona Norte,blue,1,1,tunnel,PK 1+000
`);

  assert.deepEqual(rows.map((row) => row.code), ['EJ-T-001', 'EJ-T-002']);
  assert.equal(rows[0].zoneColor, 'blue');
  assert.equal(rows[0].itineraryNumber, 1);
  assert.equal(rows[0].environment, 'tunnel');
});

test('rejects CSV missing required columns', () => {
  assert.throws(
    () => parseProjectCodeCatalogCsv('code,zone\nEJ-T-001,Zona Norte\n'),
    /Missing required CSV columns/
  );
});

test('rejects invalid zone color and environment values', () => {
  assert.throws(
    () =>
      parseProjectCodeCatalogCsv(`code,zone,zone_color,itinerary_number,itinerary_order,environment,pk
EJ-T-001,Zona Norte,red,1,1,tunnel,PK 1+000
`),
    /Invalid zone_color/
  );

  assert.throws(
    () =>
      parseProjectCodeCatalogCsv(`code,zone,zone_color,itinerary_number,itinerary_order,environment,pk
EJ-T-001,Zona Norte,blue,1,1,shaft,PK 1+000
`),
    /Invalid environment/
  );
});
