import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type SourceFormat = 'trimble_csv' | 'trimble_rpd' | 'leica_txt';

interface MonitoringReading {
  sourceFile: string;
  format: SourceFormat;
  inferredStationCode: string | null;
  pointCode: string;
  face: string | null;
  measuredAt: string | null;
  horizontalAngle: number | null;
  verticalAngle: number | null;
  slopeDistance: number | null;
  easting: number | null;
  northing: number | null;
  reducedLevel: number | null;
  prismConstant: number | null;
}

interface MonitoringObservationCandidate extends MonitoringReading {
  externalKey: string;
  prismExternalId: string;
}

interface PrismCandidate {
  externalId: string;
  code: string;
  groupCode: string | null;
  inferredStationCode: string | null;
  stationCodes: string[];
  sourceFormats: SourceFormat[];
  sourceFiles: string[];
  readingCount: number;
  faceCount: number;
  firstMeasuredAt: string | null;
  lastMeasuredAt: string | null;
  prismConstants: number[];
  minSlopeDistance: number | null;
  maxSlopeDistance: number | null;
  hasCoordinates: boolean;
  notes: string;
}

interface FileSummary {
  sourceFile: string;
  format: SourceFormat;
  inferredStationCode: string | null;
  readingCount: number;
  uniquePointCount: number;
}

interface InspectionReport {
  generatedAt: string;
  topotaskBackendPath: string;
  fixturePath: string;
  scannedFiles: number;
  parsedFiles: FileSummary[];
  ignoredFiles: string[];
  duplicateFiles: Array<{
    sourceFile: string;
    duplicateOf: string;
    hash: string;
  }>;
  warnings: string[];
  totals: {
    readings: number;
    prismCandidates: number;
    candidatesWithCoordinates: number;
    filesByFormat: Record<SourceFormat, number>;
  };
  stationGroups: Array<{
    inferredStationCode: string | null;
    candidateCount: number;
    readingCount: number;
    sourceFiles: string[];
  }>;
  coverageGroups: Array<{
    groupCode: string;
    totalUniquePrisms: number;
    stationCodes: string[];
    stations: Array<{
      stationCode: string;
      visiblePrisms: string[];
      missingPrisms: string[];
      sourceFiles: string[];
    }>;
  }>;
  observationCandidates: MonitoringObservationCandidate[];
  prismCandidates: PrismCandidate[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../');
const defaultTopotaskBackendPath = path.resolve(repoRoot, '../../Topotask/topotask-backend');
const topotaskBackendPath = process.env.TOPOTASK_BACKEND_PATH
  ? path.resolve(process.env.TOPOTASK_BACKEND_PATH)
  : defaultTopotaskBackendPath;
const fixturePath = path.join(topotaskBackendPath, 'tests', 'fixtures');
const outputPath = path.join(repoRoot, 'data', 'topotask-monitoring-prism-candidates.json');

interface SourceFileCandidate {
  absolutePath: string;
  sourceFile: string;
}

const parseNumber = (value: string | undefined) => {
  if (value === undefined || value.trim() === '') {
    return null;
  }

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const getContentHash = (content: string) => {
  return createHash('sha256').update(content).digest('hex');
};

const getStableHash = (value: unknown) => {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32);
};

const parseDateValue = (value: string | null) => {
  if (!value) {
    return null;
  }

  const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/);
  if (isoMatch) {
    return isoMatch[4] ? `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]} ${isoMatch[4]}` : `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const slashDateMatch = value.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}:\d{2}:\d{2}))?/);
  if (slashDateMatch) {
    const date = `${slashDateMatch[3]}-${slashDateMatch[2]}-${slashDateMatch[1]}`;
    return slashDateMatch[4] ? `${date} ${slashDateMatch[4]}` : date;
  }

  const monthMap: Record<string, string> = {
    Jan: '01',
    Feb: '02',
    Mar: '03',
    Apr: '04',
    May: '05',
    Jun: '06',
    Jul: '07',
    Aug: '08',
    Sep: '09',
    Oct: '10',
    Nov: '11',
    Dec: '12'
  };
  const euroMonthMatch = value.match(/(\d{2})-([A-Za-z]{3})-(\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/);
  if (euroMonthMatch) {
    const month = monthMap[euroMonthMatch[2]] ?? '01';
    const date = `20${euroMonthMatch[3]}-${month}-${euroMonthMatch[1]}`;
    return euroMonthMatch[4] ? `${date} ${euroMonthMatch[4]}` : date;
  }

  return value;
};

const inferStationCodeFromFile = (fileName: string) => {
  const fileNameWithoutExtension = fileName
    .replace(/\s*\(\d+\)(?=\.[^.]+$)/, '')
    .replace(/\.[^.]+$/, '');
  const match = fileNameWithoutExtension.match(/^\d{6}(.+?)(?:[_.]\d+)?$/);
  return match?.[1] ?? null;
};

const getStationCoverageGroupCode = (stationCode: string | null) => {
  if (!stationCode) {
    return null;
  }

  const dotSeriesMatch = stationCode.match(/^([A-Za-z]+\d+)\.\d+$/);
  if (dotSeriesMatch) {
    return dotSeriesMatch[1];
  }

  return stationCode;
};

const getPrismExternalId = (stationCode: string | null, pointCode: string) => {
  return `topotask:${getStationCoverageGroupCode(stationCode) ?? 'unknown'}:${pointCode}`;
};

const splitCsvLine = (line: string) => {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === ',' && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());
  return values;
};

const getCsvValue = (row: Record<string, string>, candidates: string[]) => {
  const normalizedCandidates = new Set(candidates.map((candidate) => candidate.toLowerCase()));
  const matchingKey = Object.keys(row).find((key) => normalizedCandidates.has(key.toLowerCase().replace(/[\s()]/g, '')));
  return matchingKey ? row[matchingKey] : undefined;
};

const parseTrimbleCsv = (fileName: string, content: string): MonitoringReading[] => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);
  const readings: MonitoringReading[] = [];

  for (const line of lines.slice(1)) {
    const values = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    const pointCode = getCsvValue(row, ['ptname', 'pointname', 'pointid', 'point', 'id', 'name']);
    const slopeDistance = getCsvValue(row, ['sd', 'elev', 'elevation', 'height', 'z', 'cota']);

    if (!pointCode || !slopeDistance) {
      continue;
    }

    const date = getCsvValue(row, ['date', 'datetime', 'fecha']);
    const time = getCsvValue(row, ['time', 'hora']);
    const measuredAt = parseDateValue(date && time ? `${date} ${time}` : date ?? null);

    readings.push({
      sourceFile: fileName,
      format: 'trimble_csv',
      inferredStationCode: inferStationCodeFromFile(fileName),
      pointCode,
      face: null,
      measuredAt,
      horizontalAngle: parseNumber(getCsvValue(row, ['ha', 'horizontalangle', 'horizontal'])),
      verticalAngle: parseNumber(getCsvValue(row, ['va', 'verticalangle', 'vertical'])),
      slopeDistance: parseNumber(slopeDistance),
      easting: parseNumber(getCsvValue(row, ['east', 'easting', 'este', 'x', 'e'])),
      northing: parseNumber(getCsvValue(row, ['north', 'northing', 'norte', 'y', 'n'])),
      reducedLevel: null,
      prismConstant: parseNumber(getCsvValue(row, ['prismconstant', 'prisma', 'prism']))
    });
  }

  return readings;
};

const parseTrimbleRpd = (fileName: string, content: string): MonitoringReading[] => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split('\t').map((header) => header.trim());
  const readings: MonitoringReading[] = [];

  for (const line of lines.slice(1)) {
    const values = line.split('\t');
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? '']));
    const pointCode = row['Pt Name'];
    const code = row.Code;

    if (!pointCode || code === 'BORRAR_BASE') {
      continue;
    }

    const horizontalAngle = parseNumber(row.HA);
    const verticalAngle = parseNumber(row.VA);
    const slopeDistance = parseNumber(row.SD);

    if (horizontalAngle === null || verticalAngle === null || slopeDistance === null) {
      continue;
    }

    const easting = parseNumber(row['Easting (m)']);
    const northing = parseNumber(row['Northing (m)']);
    const reducedLevel = parseNumber(row['RL (m)']);
    const dateTime = row.Date_Time || `${row.Date ?? ''} ${row.Time ?? ''}`.trim();

    readings.push({
      sourceFile: fileName,
      format: 'trimble_rpd',
      inferredStationCode: inferStationCodeFromFile(fileName),
      pointCode,
      face: row.Face ? `V${row.Face}` : null,
      measuredAt: parseDateValue(dateTime || null),
      horizontalAngle,
      verticalAngle,
      slopeDistance,
      easting: easting === 1 ? null : easting,
      northing: northing === 1 ? null : northing,
      reducedLevel: reducedLevel === 1 ? null : reducedLevel,
      prismConstant: parseNumber(row.PrismConstant)
    });
  }

  return readings;
};

const parseLeicaTxt = (fileName: string, content: string): MonitoringReading[] => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
  const readings: MonitoringReading[] = [];
  let stationCode = inferStationCodeFromFile(fileName);

  for (const line of lines) {
    const values = line.split('\t').map((value) => value.trim());
    const rowType = values[0];

    if (rowType === 'E' && values[1]) {
      stationCode = values[1];
      continue;
    }

    if (!/^V\d+$/.test(rowType)) {
      continue;
    }

    const pointCode = values[1];
    const horizontalAngle = parseNumber(values[7]);
    const verticalAngle = parseNumber(values[8]);
    const slopeDistance = parseNumber(values[9]);

    if (!pointCode || horizontalAngle === null || verticalAngle === null || slopeDistance === null) {
      continue;
    }

    readings.push({
      sourceFile: fileName,
      format: 'leica_txt',
      inferredStationCode: stationCode,
      pointCode,
      face: rowType,
      measuredAt: parseDateValue(values[3] || null),
      horizontalAngle,
      verticalAngle,
      slopeDistance,
      easting: null,
      northing: null,
      reducedLevel: null,
      prismConstant: parseNumber(values[5])
    });
  }

  return readings;
};

const getUniqueSortedValues = <T>(values: T[]) => {
  return Array.from(new Set(values)).sort((first, second) => String(first).localeCompare(String(second)));
};

const getDateRange = (values: Array<string | null>) => {
  const validValues = values.filter((value): value is string => value !== null).sort();
  return {
    firstMeasuredAt: validValues[0] ?? null,
    lastMeasuredAt: validValues.at(-1) ?? null
  };
};

const buildPrismCandidates = (readings: MonitoringReading[]) => {
  const groupedReadings = new Map<string, MonitoringReading[]>();

  for (const reading of readings) {
    const key = getPrismExternalId(reading.inferredStationCode, reading.pointCode);
    const currentReadings = groupedReadings.get(key) ?? [];
    currentReadings.push(reading);
    groupedReadings.set(key, currentReadings);
  }

  const candidates: PrismCandidate[] = [];

  for (const [key, candidateReadings] of groupedReadings.entries()) {
    const firstReading = candidateReadings[0];
    const slopeDistances = candidateReadings
      .map((reading) => reading.slopeDistance)
      .filter((value): value is number => value !== null);
    const prismConstants = getUniqueSortedValues(
      candidateReadings
        .map((reading) => reading.prismConstant)
        .filter((value): value is number => value !== null)
    );
    const dateRange = getDateRange(candidateReadings.map((reading) => reading.measuredAt));
    const sourceFiles = getUniqueSortedValues(candidateReadings.map((reading) => reading.sourceFile));
    const sourceFormats = getUniqueSortedValues(candidateReadings.map((reading) => reading.format));
    const stationCodes = getUniqueSortedValues(
      candidateReadings
        .map((reading) => reading.inferredStationCode)
        .filter((stationCode): stationCode is string => stationCode !== null)
    );
    const faceCount = new Set(
      candidateReadings
        .map((reading) => reading.face)
        .filter((face): face is string => face !== null)
    ).size;
    const hasCoordinates = candidateReadings.some((reading) => reading.easting !== null && reading.northing !== null);

    candidates.push({
      externalId: key,
      code: firstReading.pointCode,
      groupCode: getStationCoverageGroupCode(firstReading.inferredStationCode),
      inferredStationCode: firstReading.inferredStationCode,
      stationCodes,
      sourceFormats,
      sourceFiles,
      readingCount: candidateReadings.length,
      faceCount,
      firstMeasuredAt: dateRange.firstMeasuredAt,
      lastMeasuredAt: dateRange.lastMeasuredAt,
      prismConstants,
      minSlopeDistance: slopeDistances.length > 0 ? Math.min(...slopeDistances) : null,
      maxSlopeDistance: slopeDistances.length > 0 ? Math.max(...slopeDistances) : null,
      hasCoordinates,
      notes: `Candidato detectado desde TopoTask (${sourceFiles.join(', ')})`
    });
  }

  return candidates.sort((first, second) => first.externalId.localeCompare(second.externalId));
};

const buildObservationCandidates = (readings: MonitoringReading[]): MonitoringObservationCandidate[] => {
  return readings.map((reading) => {
    const prismExternalId = getPrismExternalId(reading.inferredStationCode, reading.pointCode);

    return {
      ...reading,
      externalKey: `topotask:observation:${getStableHash(reading)}`,
      prismExternalId
    };
  });
};

const buildStationGroups = (readings: MonitoringReading[]) => {
  const groupedReadings = new Map<string, MonitoringReading[]>();

  for (const reading of readings) {
    const key = reading.inferredStationCode ?? 'unknown';
    const currentReadings = groupedReadings.get(key) ?? [];
    currentReadings.push(reading);
    groupedReadings.set(key, currentReadings);
  }

  return Array.from(groupedReadings.entries())
    .map(([stationCode, stationReadings]) => ({
      inferredStationCode: stationCode === 'unknown' ? null : stationCode,
      candidateCount: new Set(stationReadings.map((reading) => reading.pointCode)).size,
      readingCount: stationReadings.length,
      sourceFiles: getUniqueSortedValues(stationReadings.map((reading) => reading.sourceFile))
    }))
    .sort((first, second) => (first.inferredStationCode ?? '').localeCompare(second.inferredStationCode ?? ''));
};

const buildCoverageGroups = (readings: MonitoringReading[]) => {
  const stationCodes = getUniqueSortedValues(
    readings
      .map((reading) => reading.inferredStationCode)
      .filter((stationCode): stationCode is string => stationCode !== null)
  );
  const groupedStations = new Map<string, string[]>();

  for (const stationCode of stationCodes) {
    const groupCode = getStationCoverageGroupCode(stationCode);

    if (!groupCode) {
      continue;
    }

    const currentStationCodes = groupedStations.get(groupCode) ?? [];
    currentStationCodes.push(stationCode);
    groupedStations.set(groupCode, currentStationCodes);
  }

  return Array.from(groupedStations.entries())
    .filter(([, groupStationCodes]) => groupStationCodes.length > 1)
    .map(([groupCode, groupStationCodes]) => {
      const groupReadings = readings.filter((reading) => {
        return reading.inferredStationCode !== null && groupStationCodes.includes(reading.inferredStationCode);
      });
      const allPrisms = getUniqueSortedValues(groupReadings.map((reading) => reading.pointCode));
      const sortedStationCodes = getUniqueSortedValues(groupStationCodes);

      return {
        groupCode,
        totalUniquePrisms: allPrisms.length,
        stationCodes: sortedStationCodes,
        stations: sortedStationCodes.map((stationCode) => {
          const stationReadings = groupReadings.filter((reading) => reading.inferredStationCode === stationCode);
          const visiblePrisms = getUniqueSortedValues(stationReadings.map((reading) => reading.pointCode));
          const visiblePrismSet = new Set(visiblePrisms);

          return {
            stationCode,
            visiblePrisms,
            missingPrisms: allPrisms.filter((prismCode) => !visiblePrismSet.has(prismCode)),
            sourceFiles: getUniqueSortedValues(stationReadings.map((reading) => reading.sourceFile))
          };
        })
      };
    })
    .sort((first, second) => first.groupCode.localeCompare(second.groupCode));
};

const inspectTopotaskMonitoring = async () => {
  const directoryEntries = await fs.readdir(fixturePath, { withFileTypes: true });
  const fixtureSourceFiles: SourceFileCandidate[] = directoryEntries
    .filter((entry) => entry.isFile() && ['.csv', '.rpd', '.txt'].includes(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({
      absolutePath: path.join(fixturePath, entry.name),
      sourceFile: entry.name
    }))
    .sort((first, second) => first.sourceFile.localeCompare(second.sourceFile));
  const extraSourceFiles: SourceFileCandidate[] = (process.env.TOPOTASK_MONITORING_FILES ?? '')
    .split(';')
    .map((filePath) => filePath.trim())
    .filter((filePath) => filePath !== '')
    .map((filePath) => ({
      absolutePath: path.resolve(filePath),
      sourceFile: path.basename(filePath)
    }));
  const sourceFiles = [...fixtureSourceFiles, ...extraSourceFiles];

  const parsedFiles: FileSummary[] = [];
  const ignoredFiles: string[] = [];
  const duplicateFiles: InspectionReport['duplicateFiles'] = [];
  const warnings: string[] = [];
  const readings: MonitoringReading[] = [];
  const seenHashes = new Map<string, string>();

  for (const sourceFile of sourceFiles) {
    try {
      const content = await fs.readFile(sourceFile.absolutePath, 'utf8');
      const contentHash = getContentHash(content);
      const duplicateOf = seenHashes.get(contentHash);

      if (duplicateOf) {
        ignoredFiles.push(sourceFile.sourceFile);
        duplicateFiles.push({
          sourceFile: sourceFile.sourceFile,
          duplicateOf,
          hash: contentHash
        });
        continue;
      }

      seenHashes.set(contentHash, sourceFile.sourceFile);

      const extension = path.extname(sourceFile.sourceFile).toLowerCase();
      const format: SourceFormat = extension === '.rpd'
        ? 'trimble_rpd'
        : extension === '.txt'
          ? 'leica_txt'
          : 'trimble_csv';
      const fileReadings = format === 'trimble_rpd'
        ? parseTrimbleRpd(sourceFile.sourceFile, content)
        : format === 'leica_txt'
          ? parseLeicaTxt(sourceFile.sourceFile, content)
          : parseTrimbleCsv(sourceFile.sourceFile, content);

      if (fileReadings.length === 0) {
        ignoredFiles.push(sourceFile.sourceFile);
        warnings.push(`${sourceFile.sourceFile}: no se detectaron lecturas válidas`);
        continue;
      }

      readings.push(...fileReadings);
      parsedFiles.push({
        sourceFile: sourceFile.sourceFile,
        format,
        inferredStationCode: fileReadings[0]?.inferredStationCode ?? inferStationCodeFromFile(sourceFile.sourceFile),
        readingCount: fileReadings.length,
        uniquePointCount: new Set(fileReadings.map((reading) => reading.pointCode)).size
      });
    } catch (error) {
      ignoredFiles.push(sourceFile.sourceFile);
      warnings.push(`${sourceFile.sourceFile}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const observationCandidates = buildObservationCandidates(readings);
  const prismCandidates = buildPrismCandidates(readings);
  const report: InspectionReport = {
    generatedAt: new Date().toISOString(),
    topotaskBackendPath,
    fixturePath,
    scannedFiles: sourceFiles.length,
    parsedFiles,
    ignoredFiles,
    duplicateFiles,
    warnings,
    totals: {
      readings: readings.length,
      prismCandidates: prismCandidates.length,
      candidatesWithCoordinates: prismCandidates.filter((candidate) => candidate.hasCoordinates).length,
      filesByFormat: {
        leica_txt: parsedFiles.filter((file) => file.format === 'leica_txt').length,
        trimble_csv: parsedFiles.filter((file) => file.format === 'trimble_csv').length,
        trimble_rpd: parsedFiles.filter((file) => file.format === 'trimble_rpd').length
      }
    },
    stationGroups: buildStationGroups(readings),
    coverageGroups: buildCoverageGroups(readings),
    observationCandidates,
    prismCandidates
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`TopoTask monitoring inspection completed.`);
  console.log(`Scanned files: ${report.scannedFiles}`);
  console.log(`Parsed files: ${report.parsedFiles.length}`);
  console.log(`Readings: ${report.totals.readings}`);
  console.log(`Prism candidates: ${report.totals.prismCandidates}`);
  console.log(`Candidates with coordinates: ${report.totals.candidatesWithCoordinates}`);
  console.log(`Duplicate files ignored: ${report.duplicateFiles.length}`);
  console.log(`Report: ${outputPath}`);

  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length}`);
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
};

inspectTopotaskMonitoring().catch((error) => {
  console.error(error);
  process.exit(1);
});
