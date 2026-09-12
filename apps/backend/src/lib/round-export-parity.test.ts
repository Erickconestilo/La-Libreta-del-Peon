import assert from 'node:assert/strict';
import test from 'node:test';

import ExcelJS from 'exceljs';

import { ROUND_EXPORT_COLUMNS, roundExportRowsToCsv, roundExportRowsToXlsx } from './round-export.js';
import type { RoundExportRow } from '../contracts/round-export.js';

const rows: RoundExportRow[] = [
  {
    attachmentCount: 1,
    controlPointCode: 'CP-01',
    controlPointName: 'Referencia principal',
    delta: 0.4,
    instrumentType: 'digital_level',
    measuredAt: '2026-09-12T08:15:00.000Z',
    notes: 'Lectura confirmada',
    operator: 'operator@example.test',
    pk: 'PK 10+200',
    pointStatus: 'taken',
    projectCode: 'DEMO',
    projectName: 'Obra demo',
    readingStatus: 'confirmed',
    roundDate: '2026-09-12',
    roundName: 'Ronda de validacion',
    roundStatus: 'active',
    seccion: 'S1',
    side: 'left',
    thresholdStatus: 'normal',
    tramo: 'T1',
    unit: 'mm',
    valueNumeric: 12.5,
    valueText: null,
    zone: 'Zona Norte'
  },
  {
    attachmentCount: 0,
    controlPointCode: 'CP-02',
    controlPointName: 'Punto pendiente',
    delta: null,
    instrumentType: 'piezometer',
    measuredAt: null,
    notes: 'Sin lectura todavia',
    operator: null,
    pk: null,
    pointStatus: 'pending',
    projectCode: 'DEMO',
    projectName: 'Obra demo',
    readingStatus: null,
    roundDate: '2026-09-12',
    roundName: 'Ronda de validacion',
    roundStatus: 'active',
    seccion: null,
    side: 'axis',
    thresholdStatus: 'unknown',
    tramo: null,
    unit: null,
    valueNumeric: null,
    valueText: null,
    zone: 'Zona Sur'
  }
];

const parseCsv = (input: string): string[][] => {
  const source = input.startsWith('\uFEFF') ? input.slice(1) : input;
  const result: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && source[index + 1] === '\n') {
        index += 1;
      }
      row.push(field);
      result.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    result.push(row);
  }

  return result;
};

const canonicalValue = (key: keyof RoundExportRow, value: unknown): unknown => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (key === 'roundDate') {
    return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  }

  if (key === 'measuredAt') {
    return value instanceof Date ? value.toISOString() : String(value);
  }

  if (key === 'attachmentCount' || key === 'delta' || key === 'valueNumeric') {
    return Number(value);
  }

  return String(value);
};

const recordsToRows = (records: unknown[][]): unknown[][] =>
  records.slice(1).map((record) =>
    ROUND_EXPORT_COLUMNS.map((column, index) => canonicalValue(column.key, record[index]))
  );

test('CSV y XLSX conservan las mismas filas, incluidos los puntos pendientes', async () => {
  const csvRecords = parseCsv(roundExportRowsToCsv(rows));
  const workbook = new ExcelJS.Workbook();
  const xlsxBuffer = await roundExportRowsToXlsx(rows);
  const loadBuffer = xlsxBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(loadBuffer);
  const worksheet = workbook.getWorksheet('Auscultación');

  assert.ok(worksheet);
  assert.equal(csvRecords.length, rows.length + 1);
  assert.deepEqual(csvRecords[0], ROUND_EXPORT_COLUMNS.map((column) => column.header));
  assert.equal(worksheet.getRow(1).cellCount, ROUND_EXPORT_COLUMNS.length);
  assert.deepEqual(
    recordsToRows(csvRecords),
    recordsToRows(
      Array.from({ length: worksheet.rowCount }, (_, rowIndex) =>
        ROUND_EXPORT_COLUMNS.map((column, columnIndex) => worksheet.getRow(rowIndex + 1).getCell(columnIndex + 1).value)
      )
    )
  );

  assert.equal(worksheet.views[0]?.state, 'frozen');
  assert.equal(worksheet.views[0]?.ySplit, 1);
  const autoFilter = worksheet.autoFilter;
  const autoFilterRange =
    typeof autoFilter === 'string' ? autoFilter : autoFilter ? `${autoFilter.from}:${autoFilter.to}` : null;
  assert.equal(autoFilterRange, 'A1:X1');
  assert.equal(csvRecords[2]?.[13], 'pending');
  assert.equal(csvRecords[2]?.[15], '');
});
