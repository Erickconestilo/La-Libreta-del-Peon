import assert from 'node:assert/strict';
import test from 'node:test';

import { excelColumnName, ROUND_EXPORT_COLUMNS, roundExportRowsToCsv, roundExportRowsToXlsx } from './round-export.js';
import type { RoundExportRow } from '../contracts/round-export.js';

const row: RoundExportRow = {
  attachmentCount: 2,
  controlPointCode: 'CP-01',
  controlPointName: 'Punto, norte',
  delta: 1.25,
  instrumentType: 'potentiometer',
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
  side: 'axis',
  thresholdStatus: 'normal',
  tramo: 'T1',
  unit: 'mm',
  valueNumeric: 12.5,
  valueText: null,
  workExecutionAt: '2026-08-24T10:05:00.000Z',
  workExecutionNotes: 'Comprobado en campo',
  workExecutionOperator: 'topografo@example.test',
  workExecutionReason: null,
  workExecutionStatus: 'completed',
  zone: 'Zona Norte'
};

test('round export contract keeps a stable column order and escapes CSV values', () => {
  const csv = roundExportRowsToCsv([row]);

  assert.equal(ROUND_EXPORT_COLUMNS.length, 29);
  assert.match(csv, /obra_codigo,obra_nombre/);
  assert.match(csv, /"Punto, norte"/);
  assert.match(csv, /"Nota con, coma\ny salto"/);
  assert.match(csv, /CP-01/);
});

test('round export calcula nombres de columna Excel después de Z', () => {
  assert.equal(excelColumnName(24), 'X');
  assert.equal(excelColumnName(26), 'Z');
  assert.equal(excelColumnName(27), 'AA');
  assert.equal(excelColumnName(29), 'AC');
});

test('round export generates an XLSX workbook from the same canonical row', async () => {
  const buffer = await roundExportRowsToXlsx([row]);

  assert.ok(buffer.length > 1000);
  assert.equal(buffer.subarray(0, 2).toString('utf8'), 'PK');
});
