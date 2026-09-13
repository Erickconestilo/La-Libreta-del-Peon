import assert from 'node:assert/strict';
import test from 'node:test';

import { roundExportRowsToCsv, roundExportRowsToXlsx } from './round-export.js';
import { ExportArtifactVerificationError, verifyRoundExportArtifacts } from './round-export-artifact-verifier.js';
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
    workExecutionAt: '2026-09-12T08:20:00.000Z',
    workExecutionNotes: 'Trabajo completado',
    workExecutionOperator: 'operator@example.test',
    workExecutionReason: null,
    workExecutionStatus: 'completed',
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
    workExecutionAt: null,
    workExecutionNotes: null,
    workExecutionOperator: null,
    workExecutionReason: 'Sin acceso',
    workExecutionStatus: 'blocked',
    zone: 'Zona Sur'
  }
];

test('CSV y XLSX conservan las mismas filas, incluidos los puntos pendientes', async () => {
  const result = await verifyRoundExportArtifacts(roundExportRowsToCsv(rows), await roundExportRowsToXlsx(rows));

  assert.equal(result.csvHasUtf8Bom, true);
  assert.equal(result.csvRowCount, rows.length);
  assert.equal(result.xlsxRowCount, rows.length);
  assert.deepEqual(result.rows, rows);
  assert.equal(result.rows[1]?.pointStatus, 'pending');
  assert.equal(result.rows[1]?.valueNumeric, null);
});

test('el verificador rechaza una diferencia real entre CSV y XLSX', async () => {
  const csv = roundExportRowsToCsv(rows).replace('12.5', '13.5');
  const xlsx = await roundExportRowsToXlsx(rows);

  await assert.rejects(
    verifyRoundExportArtifacts(csv, xlsx),
    (error: unknown) => error instanceof ExportArtifactVerificationError && /fila de datos 1/.test(error.message)
  );
});
