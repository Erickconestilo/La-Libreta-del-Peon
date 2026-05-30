import { pool } from '../db/pool.js';
import type { CreateStationInput } from '../utils/station-validation.js';

const mapStationRow = (row: Record<string, unknown>) => {
  return {
    createdAt: row.created_at,
    createdBy: row.created_by,
    deviceType: row.device_type,
    displayMode: row.display_mode,
    elevation: row.elevation,
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    mapStatus: row.map_status,
    name: row.name,
    notes: row.notes,
    photoUrl: row.photo_url,
    projectId: row.project_id,
    resolvedMethod: row.resolved_method,
    status: row.status,
    updatedAt: row.updated_at,
    utmEasting: row.utm_easting,
    utmNorthing: row.utm_northing,
    utmZone: row.utm_zone
  };
};

const mapReadingRow = (row: Record<string, unknown>) => {
  return {
    accuracy: row.accuracy,
    bearing: row.bearing,
    capturedOnline: row.captured_online,
    createdAt: row.created_at,
    declination: row.declination,
    elevation: row.elevation,
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    mapUrl: row.map_url,
    rawPayload: row.raw_payload,
    source: row.source,
    speedKmh: row.speed_kmh,
    stationId: row.station_id,
    utmEasting: row.utm_easting,
    utmNorthing: row.utm_northing,
    utmZone: row.utm_zone
  };
};

export const listStations = async (projectId?: string | null) => {
  const query = `
    SELECT
      s.id,
      s.project_id,
      s.name,
      s.device_type,
      s.map_status,
      s.lat,
      s.lng,
      s.utm_zone,
      s.utm_easting,
      s.utm_northing,
      s.elevation,
      s.resolved_method,
      s.display_mode,
      s.photo_url,
      s.notes,
      s.created_by,
      s.created_at,
      s.updated_at,
      s.status,
      p.name AS project_name,
      p.code AS project_code
    FROM stations s
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE ($1::uuid IS NULL OR s.project_id = $1::uuid)
    ORDER BY p.name NULLS LAST, s.name ASC
  `;

  const result = await pool.query(query, [projectId ?? null]);

  return result.rows.map((row) => ({
    ...mapStationRow(row),
    project: row.project_name
      ? {
          code: row.project_code,
          name: row.project_name
        }
      : null
  }));
};

export const getStationById = async (stationId: string) => {
  const stationQuery = `
    SELECT
      s.id,
      s.project_id,
      s.name,
      s.device_type,
      s.map_status,
      s.lat,
      s.lng,
      s.utm_zone,
      s.utm_easting,
      s.utm_northing,
      s.elevation,
      s.resolved_method,
      s.display_mode,
      s.photo_url,
      s.notes,
      s.created_by,
      s.created_at,
      s.updated_at,
      s.status,
      p.name AS project_name,
      p.code AS project_code
    FROM stations s
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE s.id = $1
  `;

  const readingQuery = `
    SELECT
      id,
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
      raw_payload,
      created_at
    FROM station_readings
    WHERE station_id = $1
    ORDER BY created_at ASC
  `;

  const [stationResult, readingsResult] = await Promise.all([
    pool.query(stationQuery, [stationId]),
    pool.query(readingQuery, [stationId])
  ]);

  if (stationResult.rowCount === 0) {
    return null;
  }

  const station = stationResult.rows[0];

  return {
    ...mapStationRow(station),
    project: station.project_name
      ? {
          code: station.project_code,
          name: station.project_name
        }
      : null,
    readings: readingsResult.rows.map(mapReadingRow)
  };
};

export const createStation = async (input: CreateStationInput, createdBy: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const stationInsertQuery = `
      INSERT INTO stations (
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
        photo_url,
        notes,
        created_by,
        status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING id
    `;

    const stationInsertValues = [
      input.projectId ?? null,
      input.name,
      input.deviceType ?? null,
      input.mapStatus ?? null,
      input.lat ?? null,
      input.lng ?? null,
      input.utmZone ?? null,
      input.utmEasting ?? null,
      input.utmNorthing ?? null,
      input.elevation ?? null,
      input.resolvedMethod ?? null,
      input.displayMode ?? null,
      input.photoUrl ?? null,
      input.notes ?? null,
      createdBy,
      input.status
    ];

    const stationResult = await client.query(stationInsertQuery, stationInsertValues);
    const stationId = stationResult.rows[0].id as string;

    for (const reading of input.readings) {
      const readingInsertQuery = `
        INSERT INTO station_readings (
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
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
      `;

      const readingInsertValues = [
        stationId,
        reading.source,
        reading.lat,
        reading.lng,
        reading.utmZone ?? null,
        reading.utmEasting ?? null,
        reading.utmNorthing ?? null,
        reading.elevation ?? null,
        reading.accuracy ?? null,
        reading.bearing ?? null,
        reading.declination ?? null,
        reading.speedKmh ?? null,
        reading.mapUrl ?? null,
        reading.capturedOnline,
        reading.rawPayload ?? null
      ];

      await client.query(readingInsertQuery, readingInsertValues);
    }

    await client.query('COMMIT');

    return stationId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
