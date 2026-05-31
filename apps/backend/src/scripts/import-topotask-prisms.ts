import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from '../db/pool.js';
import { assertWriteAllowed } from './safety.js';

const SYSTEM_IMPORT_USER_ID = '00000000-0000-0000-0000-000000000001';
const SOURCE_SYSTEM = 'topotask-monitoring';

interface PrismCandidateReport {
  externalId: string;
  code: string;
  groupCode: string | null;
  inferredStationCode: string | null;
  stationCodes: string[];
  sourceFormats: string[];
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

interface ObservationCandidateReport {
  externalKey: string;
  prismExternalId: string;
  sourceFile: string;
  format: 'trimble_csv' | 'trimble_rpd' | 'leica_txt';
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

interface MonitoringReport {
  generatedAt: string;
  totals: {
    readings: number;
    prismCandidates: number;
    candidatesWithCoordinates: number;
  };
  observationCandidates: ObservationCandidateReport[];
  prismCandidates: PrismCandidateReport[];
}

interface StationLookupRow {
  id: string;
  name: string;
  project_id: string | null;
}

interface MatchedStation {
  id: string;
  projectId: string | null;
  name: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../');
const reportPath = path.join(repoRoot, 'data', 'topotask-monitoring-prism-candidates.json');
const shouldApply = process.argv.includes('--apply');

const normalizeText = (value: string) => {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
};

const matchesStationCode = (stationCode: string, stationName: string) => {
  const normalizedName = normalizeText(stationName);
  const normalizedCode = normalizeText(stationCode);

  if (normalizedCode === 'cn1.1') {
    return normalizedName.includes('campus nord') && normalizedName.includes('1.1');
  }

  if (normalizedCode === 'cn1.2') {
    return normalizedName.includes('campus nord') && normalizedName.includes('1.2');
  }

  if (normalizedCode === 'cn1.3') {
    return normalizedName.includes('campus nord') && normalizedName.includes('1.3');
  }

  if (normalizedCode === 'cn1.4') {
    return normalizedName.includes('campus nord') && normalizedName.includes('1.4');
  }

  if (normalizedCode === 'cn2') {
    return normalizedName.includes('campus nord') && normalizedName.includes('cn2');
  }

  if (normalizedCode === 'cn3') {
    return normalizedName.includes('campus nord') && normalizedName.includes('cn3');
  }

  if (normalizedCode === 'sy1') {
    return normalizedName.includes('sanllehy') && (normalizedName.includes('sy01') || normalizedName.includes('sy1'));
  }

  if (normalizedCode === 'sy2') {
    return normalizedName.includes('sanllehy') && (normalizedName.includes('sy02') || normalizedName.includes('sy2'));
  }

  if (normalizedCode === 'sy03') {
    return normalizedName.includes('sanllehy') && normalizedName.includes('sy03');
  }

  if (normalizedCode === 'sy04') {
    return normalizedName.includes('sanllehy') && normalizedName.includes('sy04');
  }

  if (normalizedCode === 'gal_sanllehy') {
    return normalizedName.includes('sanllehy') && normalizedName.includes('galeria');
  }

  if (normalizedCode === 'pozo_sanllehy') {
    return normalizedName.includes('sanllehy') && normalizedName.includes('pozo');
  }

  if (normalizedCode === 'e01sur') {
    return normalizedName.includes('sarria') && (normalizedName.includes('e01') || normalizedName.includes('sur'));
  }

  if (normalizedCode === 'e02') {
    return normalizedName.includes('sarria') && (normalizedName.includes('e02') || normalizedName.includes('norte'));
  }

  if (normalizedCode === 'ramp') {
    return normalizedName.includes('sarria') && normalizedName.includes('rampa');
  }

  return normalizedName.includes(normalizedCode);
};

const loadMonitoringReport = async () => {
  const fileContent = await fs.readFile(reportPath, 'utf8');
  const parsedReport = JSON.parse(fileContent) as MonitoringReport;

  if (!Array.isArray(parsedReport.prismCandidates) || !Array.isArray(parsedReport.observationCandidates)) {
    throw new Error('Invalid monitoring report. Run inspect:topotask-prisms before importing.');
  }

  return parsedReport;
};

const loadStationLookup = async () => {
  const result = await pool.query<StationLookupRow>('SELECT id, name, project_id FROM stations ORDER BY name ASC');

  return result.rows;
};

const getStationMatch = (stationCode: string | null, stations: StationLookupRow[]): MatchedStation | null => {
  if (!stationCode) {
    return null;
  }

  const matchedStation = stations.find((station) => matchesStationCode(stationCode, station.name));

  if (!matchedStation) {
    return null;
  }

  return {
    id: matchedStation.id,
    name: matchedStation.name,
    projectId: matchedStation.project_id
  };
};

const ensureSystemImportUser = async () => {
  const query = `
    INSERT INTO public.users (id, email, full_name, role, is_active)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id)
    DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
  `;

  await pool.query(query, [
    SYSTEM_IMPORT_USER_ID,
    'system-import@topofield.local',
    'System Import',
    'admin',
    true
  ]);
};

const buildDryRunSummary = (
  report: MonitoringReport,
  stations: StationLookupRow[]
) => {
  const stationCodes = Array.from(
    new Set(
      report.observationCandidates
        .map((observation) => observation.inferredStationCode)
        .filter((stationCode): stationCode is string => stationCode !== null)
    )
  ).sort((first, second) => first.localeCompare(second));
  const mappedStationCodes = stationCodes
    .map((stationCode) => ({
      stationCode,
      station: getStationMatch(stationCode, stations)
    }))
    .filter((entry) => entry.station !== null);
  const unmappedStationCodes = stationCodes.filter((stationCode) => {
    return getStationMatch(stationCode, stations) === null;
  });
  const mappedObservationCount = report.observationCandidates.filter((observation) => {
    return getStationMatch(observation.inferredStationCode, stations) !== null;
  }).length;

  return {
    mappedObservationCount,
    mappedStationCodes,
    prismCount: report.prismCandidates.length,
    totalObservationCount: report.observationCandidates.length,
    unmappedObservationCount: report.observationCandidates.length - mappedObservationCount,
    unmappedStationCodes
  };
};

const importTopotaskPrisms = async () => {
  const report = await loadMonitoringReport();
  const stations = await loadStationLookup();
  const summary = buildDryRunSummary(report, stations);

  console.log(`TopoTask prism import ${shouldApply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Report generated at: ${report.generatedAt}`);
  console.log(`Prisms: ${summary.prismCount}`);
  console.log(`Observations: ${summary.totalObservationCount}`);
  console.log(`Mapped observations: ${summary.mappedObservationCount}`);
  console.log(`Unmapped observations kept by station_code: ${summary.unmappedObservationCount}`);

  if (summary.unmappedStationCodes.length > 0) {
    console.log(`Unmapped station codes: ${summary.unmappedStationCodes.join(', ')}`);
  }

  if (!shouldApply) {
    console.log('No database writes performed. Re-run with --apply to import.');
    return;
  }

  assertWriteAllowed('import-topotask-prisms');

  await ensureSystemImportUser();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const prismIdsByExternalId = new Map<string, string>();

    for (const prism of report.prismCandidates) {
      const firstStationMatch = prism.stationCodes
        .map((stationCode) => getStationMatch(stationCode, stations))
        .find((station): station is MatchedStation => station !== null);
      const prismConstant = prism.prismConstants[0] ?? null;
      const monitoringMetadata = {
        faceCount: prism.faceCount,
        groupCode: prism.groupCode,
        hasCoordinates: prism.hasCoordinates,
        maxSlopeDistance: prism.maxSlopeDistance,
        minSlopeDistance: prism.minSlopeDistance,
        prismConstants: prism.prismConstants,
        readingCount: prism.readingCount,
        sourceFormats: prism.sourceFormats,
        stationCodes: prism.stationCodes
      };

      const prismResult = await client.query<{ id: string }>(
        `
          INSERT INTO prisms (
            project_id,
            source_system,
            external_id,
            code,
            prism_constant,
            first_observed_at,
            last_observed_at,
            source_files,
            monitoring_metadata,
            notes,
            created_by,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
          ON CONFLICT (source_system, external_id) WHERE external_id IS NOT NULL
          DO UPDATE SET
            project_id = EXCLUDED.project_id,
            code = EXCLUDED.code,
            prism_constant = EXCLUDED.prism_constant,
            first_observed_at = EXCLUDED.first_observed_at,
            last_observed_at = EXCLUDED.last_observed_at,
            source_files = EXCLUDED.source_files,
            monitoring_metadata = EXCLUDED.monitoring_metadata,
            notes = EXCLUDED.notes,
            updated_at = NOW()
          RETURNING id
        `,
        [
          firstStationMatch?.projectId ?? null,
          SOURCE_SYSTEM,
          prism.externalId,
          prism.code,
          prismConstant,
          prism.firstMeasuredAt,
          prism.lastMeasuredAt,
          JSON.stringify(prism.sourceFiles),
          JSON.stringify(monitoringMetadata),
          prism.notes,
          SYSTEM_IMPORT_USER_ID
        ]
      );

      prismIdsByExternalId.set(prism.externalId, prismResult.rows[0].id);
    }

    for (const observation of report.observationCandidates) {
      const prismId = prismIdsByExternalId.get(observation.prismExternalId);

      if (!prismId) {
        throw new Error(`Missing imported prism for observation ${observation.externalKey}`);
      }

      const stationMatch = getStationMatch(observation.inferredStationCode, stations);

      await client.query(
        `
          INSERT INTO prism_observations (
            prism_id,
            station_id,
            source_system,
            external_key,
            source_file,
            source_format,
            station_code,
            face,
            measured_at,
            horizontal_angle,
            vertical_angle,
            slope_distance,
            easting,
            northing,
            reduced_level,
            prism_constant,
            raw_payload
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          )
          ON CONFLICT (source_system, external_key)
          DO UPDATE SET
            prism_id = EXCLUDED.prism_id,
            station_id = EXCLUDED.station_id,
            source_file = EXCLUDED.source_file,
            source_format = EXCLUDED.source_format,
            station_code = EXCLUDED.station_code,
            face = EXCLUDED.face,
            measured_at = EXCLUDED.measured_at,
            horizontal_angle = EXCLUDED.horizontal_angle,
            vertical_angle = EXCLUDED.vertical_angle,
            slope_distance = EXCLUDED.slope_distance,
            easting = EXCLUDED.easting,
            northing = EXCLUDED.northing,
            reduced_level = EXCLUDED.reduced_level,
            prism_constant = EXCLUDED.prism_constant,
            raw_payload = EXCLUDED.raw_payload,
            updated_at = NOW()
        `,
        [
          prismId,
          stationMatch?.id ?? null,
          SOURCE_SYSTEM,
          observation.externalKey,
          observation.sourceFile,
          observation.format,
          observation.inferredStationCode,
          observation.face,
          observation.measuredAt,
          observation.horizontalAngle,
          observation.verticalAngle,
          observation.slopeDistance,
          observation.easting,
          observation.northing,
          observation.reducedLevel,
          observation.prismConstant,
          JSON.stringify(observation)
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`Imported ${report.prismCandidates.length} prisms and ${report.observationCandidates.length} observations.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

importTopotaskPrisms()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
