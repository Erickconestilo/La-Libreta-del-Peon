import assert from 'node:assert/strict';
import test from 'node:test';

import { ROUND_EXPORT_COLUMNS, roundExportRowsToCsv, roundExportRowsToXlsx } from './round-export.js';
import type { RoundExportRow } from '../contracts/round-export.js';

const row: RoundExportRow = {
  attachmentCount: 2,
  controlPointCode: 'CP-01',
  controlPointName: 'Punto, norte',
  delta: 1.25,
  instrumentType: 'digital_level',
  measuredAt: '2026-08-24T10:00:00.000Z',
  notes: 'Nota con, coma\ny salto',
  operator: 'topografo@example.test',
  pk: 'PK 10+200',
  pointStatus: 'taken',
  projectCode: 'DEMO',
  projectName: 'Obra demo',
  readingStatus: 'confirmed',
  roundDate: '2026-08-24',
  roundName: 'Ronda demo',
  roundStatus: 'active',
  seccion: 'S1',
  side: 'left',
  thresholdStatus: 'normal',
  tramo: 'T1',
  unit: 'mm',
  valueNumeric: 12.5,
  valueText: null,
  zone: 'Zona Norte'
};

test('round export contract keeps a stable column order and escapes CSV values', () => {
  const csv = roundExportRowsToCsv([row]);

  assert.equal(ROUND_EXPORT_COLUMNS.length, 24);
  assert.match(csv, /obra_codigo,obra_nombre/);
  assert.match(csv, /"Punto, norte"/);
  assert.match(csv, /"Nota con, coma\ny salto"/);
  assert.match(csv, /CP-01/);
});

test('round export generates an XLSX workbook from the same canonical row', async () => {
  const buffer = await roundExportRowsToXlsx([row]);

  assert.ok(buffer.length > 1000);
  assert.equal(buffer.subarray(0, 2).toString('utf8'), 'PK');
});
