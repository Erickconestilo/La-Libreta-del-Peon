import assert from 'node:assert/strict';
import test from 'node:test';

import { parseProjectCodeCatalogCsv } from './project-code-catalog-csv.js';

test('parses project code catalog CSV rows in itinerary order', () => {
  const rows = parseProjectCodeCatalogCsv(`code,zone,zone_color,itinerary_number,itinerary_order,environment,pk
L8-A01,Azul,blue,1,2,tunnel,PK 1+020
L8-A00,Azul,blue,1,1,tunnel,PK 1+000
`);

  assert.deepEqual(rows.map((row) => row.code), ['L8-A00', 'L8-A01']);
  assert.equal(rows[0].zoneColor, 'blue');
  assert.equal(rows[0].itineraryNumber, 1);
  assert.equal(rows[0].environment, 'tunnel');
});

test('rejects CSV missing required columns', () => {
  assert.throws(
    () => parseProjectCodeCatalogCsv('code,zone\nL8-A00,Azul\n'),
    /Missing required CSV columns/
  );
});

test('rejects invalid zone color and environment values', () => {
  assert.throws(
    () =>
      parseProjectCodeCatalogCsv(`code,zone,zone_color,itinerary_number,itinerary_order,environment,pk
L8-A00,Azul,red,1,1,tunnel,PK 1+000
`),
    /Invalid zone_color/
  );

  assert.throws(
    () =>
      parseProjectCodeCatalogCsv(`code,zone,zone_color,itinerary_number,itinerary_order,environment,pk
L8-A00,Azul,blue,1,1,shaft,PK 1+000
`),
    /Invalid environment/
  );
});
