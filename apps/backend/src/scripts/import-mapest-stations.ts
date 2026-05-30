import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { pool } from '../db/pool.js';
import { getMaxReadingSpreadMeters } from '../utils/geo.js';

const SYSTEM_IMPORT_USER_ID = '00000000-0000-0000-0000-000000000001';
const SOURCE_SYSTEM = 'mapEst';

const readingImportSchema = z.object({
  accuracy: z.number().optional(),
  bearing: z.number().optional(),
  declination: z.number().optional(),
  position: z.object({
    elevation: z.number().optional(),
    lat: z.number(),
    lng: z.number(),
    utm: z.object({
      easting: z.number().optional(),
      northing: z.number().optional(),
      zone: z.string().optional()
    }).optional()
  }),
  source: z.enum(['gps_offline', 'mobile_network']),
  speedKmh: z.number().optional(),
  url: z.string().optional()
});

const stationImportSchema = z.object({
  deviceType: z.enum(['leica', 'trimble']),
  id: z.string().min(1),
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  readings: z.array(readingImportSchema),
  resolvedPosition: z.object({
    displayMode: z.string().optional(),
    lat: z.number(),
    lng: z.number(),
    method: z.string().optional(),
    utm: z.object({
      easting: z.number().optional(),
      northing: z.number().optional(),
      zone: z.string().optional()
    }).optional()
  }),
  status: z.enum(['approximate', 'verified', 'resolved'])
});

const stationsImportSchema = z.object({
  schemaVersion: z.number(),
  stations: z.array(stationImportSchema)
});

const getProjectCodeFromStationName = (stationName: string) => {
  const normalizedName = stationName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (normalizedName.includes('campus nord')) {
    return 'campus-nord';
  }

  if (normalizedName.includes('sarria')) {
    return 'sarria';
  }

  if (normalizedName.includes('sant gervasi de casoles')) {
    return 'sant-gervasi-de-casoles';
  }

  if (normalizedName.includes('putxe')) {
    return 'putxe';
  }

  if (normalizedName.includes('sanllehy')) {
    return 'sanllehy';
  }

  if (normalizedName.includes('maragall')) {
    return 'maragall';
  }

  return null;
};

const getReadingExternalKey = (
  stationExternalId: string,
  reading: z.infer<typeof readingImportSchema>,
  index: number
) => {
  return [
    stationExternalId,
    reading.source,
    reading.position.lat.toFixed(7),
    reading.position.lng.toFixed(7),
    reading.position.utm?.zone ?? 'no-zone',
    reading.position.utm?.easting?.toFixed(3) ?? 'no-easting',
    reading.position.utm?.northing?.toFixed(3) ?? 'no-northing',
    String(index)
  ].join(':');
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../');
const stationsJsonPath = path.join(repoRoot, 'data', 'mapEst', 'stations.json');

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

const loadStationsFile = async () => {
  const fileContent = await fs.readFile(stationsJsonPath, 'utf8');
  const parsedJson = JSON.parse(fileContent) as unknown;
  const parsedStations = stationsImportSchema.safeParse(parsedJson);

  if (!parsedStations.success) {
    throw new Error(`Invalid stations.json format: ${parsedStations.error.message}`);
  }

  return parsedStations.data.stations;
};

const assertStationsLookConsistent = (stations: Array<z.infer<typeof stationImportSchema>>) => {
  const suspiciousStations = stations
    .map((station) => {
      const spread = getMaxReadingSpreadMeters(
        station.readings.map((reading) => ({
          lat: reading.position.lat,
          lng: reading.position.lng
        }))
      );

      return {
        name: station.name,
        spread
      };
    })
    .filter((station) => station.spread > 30);

  if (suspiciousStations.length > 0) {
    const summary = suspiciousStations
      .map((station) => `${station.name} (${station.spread.toFixed(2)} m)`)
      .join(', ');

    throw new Error(`Suspicious station readings detected. Import aborted: ${summary}`);
  }
};

const importStations = async () => {
  const stations = await loadStationsFile();
  assertStationsLookConsistent(stations);
  await ensureSystemImportUser();

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const station of stations) {
      const projectCode = getProjectCodeFromStationName(station.name);
      const projectResult = projectCode
        ? await client.query('SELECT id FROM public.projects WHERE code = $1', [projectCode])
        : { rows: [] as Array<{ id: string }> };
      const projectId = projectResult.rows[0]?.id ?? null;

      const stationUpsertQuery = `
        INSERT INTO public.stations (
          source_system,
          external_id,
          project_id,
          name,
          device_type,
          map_status,
          lat,
          lng,
          utm_zone,
          utm_easting,
          utm_northing,
          elevation,
          resolved_method,
          display_mode,
          notes,
          created_by,
          status
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (source_system, external_id)
        DO UPDATE SET
          project_id = EXCLUDED.project_id,
          name = EXCLUDED.name,
          device_type = EXCLUDED.device_type,
          map_status = EXCLUDED.map_status,
          lat = EXCLUDED.lat,
          lng = EXCLUDED.lng,
          utm_zone = EXCLUDED.utm_zone,
          utm_easting = EXCLUDED.utm_easting,
          utm_northing = EXCLUDED.utm_northing,
          elevation = EXCLUDED.elevation,
          resolved_method = EXCLUDED.resolved_method,
          display_mode = EXCLUDED.display_mode,
          notes = EXCLUDED.notes,
          status = EXCLUDED.status,
          updated_at = NOW()
        RETURNING id
      `;

      const stationResult = await client.query(stationUpsertQuery, [
        SOURCE_SYSTEM,
        station.id,
        projectId,
        station.name,
        station.deviceType,
        station.status,
        station.resolvedPosition.lat,
        station.resolvedPosition.lng,
        station.resolvedPosition.utm?.zone ?? null,
        station.resolvedPosition.utm?.easting ?? null,
        station.resolvedPosition.utm?.northing ?? null,
        station.readings.find((reading) => reading.position.elevation !== undefined)?.position.elevation ?? null,
        station.resolvedPosition.method ?? null,
        station.resolvedPosition.displayMode ?? null,
        station.notes ?? null,
        SYSTEM_IMPORT_USER_ID,
        'active'
      ]);

      const stationId = stationResult.rows[0].id as string;

      for (const [index, reading] of station.readings.entries()) {
        const readingExternalKey = getReadingExternalKey(station.id, reading, index);

        const readingUpsertQuery = `
          INSERT INTO public.station_readings (
            source_system,
            external_key,
            station_id,
            source,
            lat,
            lng,
            utm_zone,
            utm_easting,
            utm_northing,
            elevation,
            accuracy,
            bearing,
            declination,
            speed_kmh,
            map_url,
            captured_online,
            raw_payload
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          )
          ON CONFLICT (source_system, external_key)
          DO UPDATE SET
            station_id = EXCLUDED.station_id,
            source = EXCLUDED.source,
            lat = EXCLUDED.lat,
            lng = EXCLUDED.lng,
            utm_zone = EXCLUDED.utm_zone,
            utm_easting = EXCLUDED.utm_easting,
            utm_northing = EXCLUDED.utm_northing,
            elevation = EXCLUDED.elevation,
            accuracy = EXCLUDED.accuracy,
            bearing = EXCLUDED.bearing,
            declination = EXCLUDED.declination,
            speed_kmh = EXCLUDED.speed_kmh,
            map_url = EXCLUDED.map_url,
            captured_online = EXCLUDED.captured_online,
            raw_payload = EXCLUDED.raw_payload
        `;

        await client.query(readingUpsertQuery, [
          SOURCE_SYSTEM,
          readingExternalKey,
          stationId,
          reading.source,
          reading.position.lat,
          reading.position.lng,
          reading.position.utm?.zone ?? null,
          reading.position.utm?.easting ?? null,
          reading.position.utm?.northing ?? null,
          reading.position.elevation ?? null,
          reading.accuracy ?? null,
          reading.bearing ?? null,
          reading.declination ?? null,
          reading.speedKmh ?? null,
          reading.url ?? null,
          reading.source === 'mobile_network',
          reading
        ]);
      }
    }

    await client.query('COMMIT');
    console.log(`Imported ${stations.length} stations from stations.json`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

importStations()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
