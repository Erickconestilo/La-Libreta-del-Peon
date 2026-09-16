import ExcelJS from 'exceljs';

import type { RoundExportRow } from '../contracts/round-export.js';

export const ROUND_EXPORT_COLUMNS = [
  { header: 'obra_codigo', key: 'projectCode' },
  { header: 'obra_nombre', key: 'projectName' },
  { header: 'ronda_nombre', key: 'roundName' },
  { header: 'ronda_fecha', key: 'roundDate' },
  { header: 'ronda_estado', key: 'roundStatus' },
  { header: 'codigo_punto', key: 'controlPointCode' },
  { header: 'nombre_punto', key: 'controlPointName' },
  { header: 'pk', key: 'pk' },
  { header: 'zona', key: 'zone' },
  { header: 'tramo', key: 'tramo' },
  { header: 'seccion', key: 'seccion' },
  { header: 'lado', key: 'side' },
  { header: 'instrumento', key: 'instrumentType' },
  { header: 'estado_punto', key: 'pointStatus' },
  { header: 'fecha_lectura', key: 'measuredAt' },
  { header: 'valor_numerico', key: 'valueNumeric' },
  { header: 'valor_texto', key: 'valueText' },
  { header: 'unidad', key: 'unit' },
  { header: 'notas', key: 'notes' },
  { header: 'operador', key: 'operator' },
  { header: 'estado_lectura', key: 'readingStatus' },
  { header: 'delta', key: 'delta' },
  { header: 'estado_umbral', key: 'thresholdStatus' },
  { header: 'adjuntos', key: 'attachmentCount' },
  { header: 'trabajo_estado', key: 'workExecutionStatus' },
  { header: 'trabajo_motivo', key: 'workExecutionReason' },
  { header: 'trabajo_notas', key: 'workExecutionNotes' },
  { header: 'trabajo_fecha', key: 'workExecutionAt' },
  { header: 'trabajo_operador', key: 'workExecutionOperator' }
] as const satisfies ReadonlyArray<{ header: string; key: keyof RoundExportRow }>;

export const excelColumnName = (columnNumber: number) => {
  let remaining = columnNumber;
  let name = '';

  while (remaining > 0) {
    const remainder = (remaining - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    remaining = Math.floor((remaining - 1) / 26);
  }

  return name;
};

const csvValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const roundExportRowsToCsv = (rows: readonly RoundExportRow[]) => {
  const header = ROUND_EXPORT_COLUMNS.map((column) => csvValue(column.header)).join(',');
  const body = rows.map((row) => ROUND_EXPORT_COLUMNS.map((column) => csvValue(row[column.key])).join(','));

  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`;
};

const xlsxDate = (value: string | null) => (value ? new Date(value) : null);

export const roundExportRowsToXlsx = async (rows: readonly RoundExportRow[]) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TopoField';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Auscultación');

  worksheet.columns = ROUND_EXPORT_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.key === 'notes' ? 36 : column.key === 'projectName' || column.key === 'roundName' ? 28 : 18
  }));
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = {
    from: 'A1',
    to: `${excelColumnName(ROUND_EXPORT_COLUMNS.length)}1`
  };

  for (const row of rows) {
    const values = ROUND_EXPORT_COLUMNS.map((column) => {
      if (column.key === 'roundDate' || column.key === 'measuredAt' || column.key === 'workExecutionAt') {
        return xlsxDate(row[column.key]);
      }

      return row[column.key];
    });
    worksheet.addRow(values);
  }

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  worksheet.getColumn('D').numFmt = 'yyyy-mm-dd';
  worksheet.getColumn('O').numFmt = 'yyyy-mm-dd hh:mm';

  return Buffer.from(await workbook.xlsx.writeBuffer());
};
