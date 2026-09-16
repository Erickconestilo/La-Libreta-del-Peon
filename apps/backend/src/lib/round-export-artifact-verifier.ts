import ExcelJS from 'exceljs';

import { excelColumnName, ROUND_EXPORT_COLUMNS } from './round-export.js';
import type { RoundExportRow } from '../contracts/round-export.js';

export class ExportArtifactVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportArtifactVerificationError';
  }
}

export interface RoundExportArtifactVerification {
  csvHasUtf8Bom: boolean;
  csvRowCount: number;
  xlsxRowCount: number;
  worksheetName: string;
  rows: RoundExportRow[];
}

const isBlank = (value: unknown) => value === null || value === undefined || value === '';

const parseCsvRecords = (input: string): string[][] => {
  const csvHasUtf8Bom = input.startsWith('\uFEFF');
  const source = csvHasUtf8Bom ? input.slice(1) : input;
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  let quoteClosed = false;

  const pushRecord = () => {
    record.push(field);
    records.push(record);
    record = [];
    field = '';
    quoteClosed = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
        quoteClosed = true;
      } else {
        field += character;
      }
      continue;
    }

    if (quoteClosed) {
      if (character === ',') {
        record.push(field);
        field = '';
        quoteClosed = false;
      } else if (character === '\r' || character === '\n') {
        if (character === '\r' && source[index + 1] === '\n') {
          index += 1;
        }
        pushRecord();
      } else {
        throw new ExportArtifactVerificationError('CSV contiene caracteres después de un campo entrecomillado');
      }
      continue;
    }

    if (character === '"') {
      if (field.length !== 0) {
        throw new ExportArtifactVerificationError('CSV contiene un campo entrecomillado inválido');
      }
      quoted = true;
    } else if (character === ',') {
      record.push(field);
      field = '';
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && source[index + 1] === '\n') {
        index += 1;
      }
      pushRecord();
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new ExportArtifactVerificationError('CSV termina dentro de un campo entrecomillado');
  }

  if (field.length !== 0 || record.length !== 0 || quoteClosed) {
    record.push(field);
    records.push(record);
  }

  return records;
};

const dateToIso = (value: unknown, key: 'roundDate' | 'measuredAt' | 'workExecutionAt'): string => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new ExportArtifactVerificationError(`XLSX contiene una fecha inválida en ${key}`);
    }
    return key === 'roundDate' ? value.toISOString().slice(0, 10) : value.toISOString();
  }

  const text = String(value);
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new ExportArtifactVerificationError(`Exportación contiene una fecha inválida en ${key}`);
  }
  return key === 'roundDate' ? parsed.toISOString().slice(0, 10) : parsed.toISOString();
};

const canonicalValue = (key: keyof RoundExportRow, value: unknown): unknown => {
  if (isBlank(value)) {
    return null;
  }

  if (key === 'roundDate' || key === 'measuredAt' || key === 'workExecutionAt') {
    return dateToIso(value, key);
  }

  if (key === 'attachmentCount' || key === 'delta' || key === 'valueNumeric') {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new ExportArtifactVerificationError(`Exportación contiene un número inválido en ${key}`);
    }
    return numeric;
  }

  return String(value);
};

const recordsToRows = (records: unknown[][], source: 'CSV' | 'XLSX'): RoundExportRow[] => {
  return records.map((record, rowIndex) => {
    if (record.length !== ROUND_EXPORT_COLUMNS.length) {
      throw new ExportArtifactVerificationError(
        `${source} tiene ${record.length} columnas en la fila ${rowIndex + 1}; se esperaban ${ROUND_EXPORT_COLUMNS.length}`
      );
    }

    const row = {} as RoundExportRow;
    ROUND_EXPORT_COLUMNS.forEach((column, columnIndex) => {
      row[column.key] = canonicalValue(column.key, record[columnIndex]) as never;
    });
    return row;
  });
};

const readAutoFilterRange = (worksheet: ExcelJS.Worksheet): string | null => {
  const autoFilter = worksheet.autoFilter;
  if (!autoFilter) {
    return null;
  }
  return typeof autoFilter === 'string' ? autoFilter : `${autoFilter.from}:${autoFilter.to}`;
};

const readXlsxRecords = (worksheet: ExcelJS.Worksheet): unknown[][] => {
  const records: unknown[][] = [];
  for (let rowIndex = 1; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    records.push(
      ROUND_EXPORT_COLUMNS.map((_, columnIndex) => worksheet.getRow(rowIndex).getCell(columnIndex + 1).value)
    );
  }
  return records;
};

export const verifyRoundExportArtifacts = async (
  csvText: string,
  xlsxBuffer: Buffer | Uint8Array
): Promise<RoundExportArtifactVerification> => {
  const csvRecords = parseCsvRecords(csvText);
  if (csvRecords.length === 0) {
    throw new ExportArtifactVerificationError('CSV está vacío');
  }

  const expectedHeaders = ROUND_EXPORT_COLUMNS.map((column) => column.header);
  if (JSON.stringify(csvRecords[0]) !== JSON.stringify(expectedHeaders)) {
    throw new ExportArtifactVerificationError('CSV no conserva la cabecera RoundExportRow');
  }

  const csvRows = recordsToRows(csvRecords.slice(1), 'CSV');
  const workbook = new ExcelJS.Workbook();
  const normalizedXlsxBuffer = Buffer.isBuffer(xlsxBuffer) ? xlsxBuffer : Buffer.from(xlsxBuffer);
  const loadBuffer = normalizedXlsxBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0];
  await workbook.xlsx.load(loadBuffer);
  const worksheet = workbook.getWorksheet('Auscultación');
  if (!worksheet) {
    throw new ExportArtifactVerificationError('XLSX no contiene la hoja Auscultación');
  }

  const xlsxRecords = readXlsxRecords(worksheet);
  if (JSON.stringify(xlsxRecords[0]) !== JSON.stringify(expectedHeaders)) {
    throw new ExportArtifactVerificationError('XLSX no conserva la cabecera RoundExportRow');
  }

  const xlsxRows = recordsToRows(xlsxRecords.slice(1), 'XLSX');
  if (worksheet.views[0]?.state !== 'frozen' || worksheet.views[0]?.ySplit !== 1) {
    throw new ExportArtifactVerificationError('XLSX no congela la primera fila');
  }
  const expectedAutoFilterRange = `A1:${excelColumnName(ROUND_EXPORT_COLUMNS.length)}1`;
  if (readAutoFilterRange(worksheet) !== expectedAutoFilterRange) {
    throw new ExportArtifactVerificationError(`XLSX no conserva el filtro ${expectedAutoFilterRange}`);
  }
  if (csvRows.length !== xlsxRows.length) {
    throw new ExportArtifactVerificationError(
      `CSV y XLSX tienen distinto número de filas (${csvRows.length} frente a ${xlsxRows.length})`
    );
  }

  for (let index = 0; index < csvRows.length; index += 1) {
    if (JSON.stringify(csvRows[index]) !== JSON.stringify(xlsxRows[index])) {
      throw new ExportArtifactVerificationError(`CSV y XLSX difieren en la fila de datos ${index + 1}`);
    }
  }

  return {
    csvHasUtf8Bom: csvText.startsWith('\uFEFF'),
    csvRowCount: csvRows.length,
    xlsxRowCount: xlsxRows.length,
    worksheetName: worksheet.name,
    rows: csvRows
  };
};
