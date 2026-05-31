import { pool } from '../db/pool.js';
import { getPublicPhotoUrl } from '../lib/photo-storage.js';
import { createChangeLog } from './change-logs.model.js';

type PrismScope = {
  params: unknown[];
  clause: string;
};

const buildPrismScopeCondition = (projectIds: string[] | null, baseOffset: number): PrismScope => {
  if (projectIds === null) {
    return { params: [], clause: '' };
  }

  if (projectIds.length === 0) {
    return { params: [], clause: 'AND 1=0' };
  }

  return {
    params: [projectIds],
    clause: `AND p.project_id = ANY($${baseOffset}::uuid[])`
  };
};

const buildStationProjectScopeCondition = (projectIds: string[] | null, baseOffset: number): PrismScope => {
  if (projectIds === null) {
    return { params: [], clause: '' };
  }

  if (projectIds.length === 0) {
    return { params: [], clause: 'AND 1=0' };
  }

  return {
    params: [projectIds],
    clause: `AND s.project_id = ANY($${baseOffset}::uuid[])`
  };
};

const mapPrismRow = (row: Record<string, unknown>) => {
  return {
    code: row.code,
    createdAt: row.created_at,
    createdBy: row.created_by,
    externalId: row.external_id,
    firstObservedAt: row.first_observed_at,
    id: row.id,
    lastObservedAt: row.last_observed_at,
    monitoringMetadata: row.monitoring_metadata,
    notes: row.notes,
    photoUrl: row.photo_url,
    prismConstant: row.prism_constant,
    projectId: row.project_id,
    sourceFiles: row.source_files,
    sourceSystem: row.source_system,
    stationId: row.station_id,
    status: row.status,
    updatedAt: row.updated_at
  };
};

const mapObservationRow = (row: Record<string, unknown>) => {
  return {
    createdAt: row.created_at,
    easting: row.easting,
    externalKey: row.external_key,
    face: row.face,
    horizontalAngle: row.horizontal_angle,
    id: row.id,
    measuredAt: row.measured_at,
    northing: row.northing,
    prismConstant: row.prism_constant,
    prismId: row.prism_id,
    reducedLevel: row.reduced_level,
    slopeDistance: row.slope_distance,
    sourceFile: row.source_file,
    sourceFormat: row.source_format,
    sourceSystem: row.source_system,
    stationCode: row.station_code,
    stationId: row.station_id,
    updatedAt: row.updated_at,
    verticalAngle: row.vertical_angle
  };
};

export const listPrismsByStationId = async (stationId: string, projectScope: string[] | null = null) => {
  const scope = buildStationProjectScopeCondition(projectScope, 2);

  const query = `
    SELECT
      p.id,
      p.station_id,
      p.project_id,
      p.source_system,
      p.external_id,
      p.code,
      p.prism_constant,
      p.first_observed_at,
      p.last_observed_at,
      p.source_files,
      p.monitoring_metadata,
      p.notes,
      p.photo_url,
      p.created_by,
      p.created_at,
      p.updated_at,
      p.status,
      COUNT(po.id)::int AS observation_count,
      MIN(po.measured_at) AS station_first_observed_at,
      MAX(po.measured_at) AS station_last_observed_at
    FROM prism_observations po
    INNER JOIN stations s ON s.id = po.station_id
    INNER JOIN prisms p ON p.id = po.prism_id
    WHERE po.station_id = $1
    ${scope.clause}
    GROUP BY p.id
    ORDER BY p.code ASC
  `;

  const result = await pool.query(
    query,
    [stationId, ...scope.params]
  );

  return result.rows.map((row) => ({
    ...mapPrismRow(row),
    observationCount: row.observation_count,
    stationFirstObservedAt: row.station_first_observed_at,
    stationLastObservedAt: row.station_last_observed_at
  }));
};

export const getPrismById = async (prismId: string, projectScope: string[] | null = null) => {
  const scope = buildPrismScopeCondition(projectScope, 2);

  const result = await pool.query(
    `
      SELECT
        id,
        station_id,
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
        photo_url,
        created_by,
        created_at,
        updated_at,
        status
      FROM prisms p
      WHERE p.id = $1
      ${scope.clause}
    `,
    [prismId, ...scope.params]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapPrismRow(result.rows[0]);
};

export const updatePrismPhoto = async (
  prismId: string,
  storagePath: string | null,
  changedBy: string,
  projectScope: string[] | null = null
) => {
  const scope = buildPrismScopeCondition(projectScope, 2);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
        SELECT p.id, p.photo_url
        FROM prisms p
        WHERE p.id = $1
        ${scope.clause}
        FOR UPDATE
      `,
      [prismId, ...scope.params]
    );

    if (currentResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const photoUrl = storagePath ? getPublicPhotoUrl(storagePath) : null;
    const oldPhotoUrl = currentResult.rows[0].photo_url as string | null;

    await client.query(
      `
        UPDATE prisms
        SET photo_url = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [prismId, photoUrl]
    );

    if (oldPhotoUrl !== photoUrl) {
      await createChangeLog(
        {
          entityId: prismId,
          entityType: 'prism',
          fieldChanged: 'photo_url',
          newValue: photoUrl,
          oldValue: oldPhotoUrl
        },
        changedBy,
        client
      );
    }

    await client.query('COMMIT');

    return getPrismById(prismId, projectScope);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listPrismObservationsByStationId = async (
  stationId: string,
  limit = 200,
  projectScope: string[] | null = null
) => {
  const scope = buildStationProjectScopeCondition(projectScope, 3);

  const query = `
    SELECT
      po.id,
      po.prism_id,
      po.station_id,
      po.source_system,
      po.external_key,
      po.source_file,
      po.source_format,
      po.station_code,
      po.face,
      po.measured_at,
      po.horizontal_angle,
      po.vertical_angle,
      po.slope_distance,
      po.easting,
      po.northing,
      po.reduced_level,
      po.prism_constant,
      po.created_at,
      po.updated_at,
      p.code AS prism_code
    FROM prism_observations po
    INNER JOIN stations s ON s.id = po.station_id
    INNER JOIN prisms p ON p.id = po.prism_id
    WHERE po.station_id = $1
    ${scope.clause}
    ORDER BY p.code ASC, po.measured_at ASC NULLS LAST
    LIMIT $2
  `;

  const result = await pool.query(
    query,
    [stationId, limit, ...scope.params]
  );

  return result.rows.map((row) => ({
    ...mapObservationRow(row),
    prismCode: row.prism_code
  }));
};

export const reconcilePrismObservationsForStation = async (
  stationId: string,
  changedBy?: string | null
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const stationResult = await client.query<{
      external_id: string | null;
      id: string;
      name: string;
    }>(
      `
        SELECT id, external_id, name
        FROM stations
        WHERE id = $1
        FOR UPDATE
      `,
      [stationId]
    );

    if (stationResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const station = stationResult.rows[0];
    const candidateCodes = Array.from(
      new Set([station.external_id, station.name].filter((value): value is string => Boolean(value?.trim())))
    );

    if (candidateCodes.length === 0) {
      await client.query('COMMIT');
      return {
        candidateCodes,
        matchedObservationCount: 0,
        stationId
      };
    }

    const updateResult = await client.query(
      `
        WITH candidate_matches AS (
          SELECT
            po.id AS observation_id,
            MIN(s.id::text)::uuid AS station_id,
            COUNT(DISTINCT s.id) AS station_count
          FROM prism_observations po
          INNER JOIN stations s
            ON po.station_code = s.external_id
            OR po.station_code = s.name
          WHERE po.station_id IS NULL
            AND po.station_code = ANY($2::text[])
          GROUP BY po.id
        ),
        safe_matches AS (
          SELECT observation_id
          FROM candidate_matches
          WHERE station_count = 1
            AND station_id = $1
        )
        UPDATE prism_observations po
        SET
          station_id = $1,
          updated_at = NOW()
        FROM safe_matches sm
        WHERE po.id = sm.observation_id
      `,
      [stationId, candidateCodes]
    );

    const matchedObservationCount = updateResult.rowCount ?? 0;

    if (changedBy && matchedObservationCount > 0) {
      await createChangeLog(
        {
          entityId: stationId,
          entityType: 'station',
          fieldChanged: 'prism_observations_reconciled',
          newValue: {
            candidateCodes,
            matchedObservationCount
          },
          oldValue: null
        },
        changedBy,
        client
      );
    }

    await client.query('COMMIT');

    return {
      candidateCodes,
      matchedObservationCount,
      stationId
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const reconcilePrismObservationsForExistingStations = async () => {
  const result = await pool.query(
    `
      WITH candidate_matches AS (
        SELECT
          po.id AS observation_id,
          MIN(s.id::text)::uuid AS station_id,
          COUNT(DISTINCT s.id) AS station_count
        FROM prism_observations po
        INNER JOIN stations s
          ON po.station_code = s.external_id
          OR po.station_code = s.name
        WHERE po.station_id IS NULL
          AND po.station_code IS NOT NULL
        GROUP BY po.id
      ),
      safe_matches AS (
        SELECT observation_id, station_id
        FROM candidate_matches
        WHERE station_count = 1
      ),
      updated AS (
        UPDATE prism_observations po
        SET
          station_id = sm.station_id,
          updated_at = NOW()
        FROM safe_matches sm
        WHERE po.id = sm.observation_id
        RETURNING po.id, po.station_id, po.station_code
      )
      SELECT
        COUNT(*)::int AS matched_observation_count,
        COUNT(DISTINCT station_id)::int AS matched_station_count,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT station_code), NULL) AS matched_station_codes
      FROM updated
    `
  );

  return {
    matchedObservationCount: result.rows[0]?.matched_observation_count ?? 0,
    matchedStationCodes: result.rows[0]?.matched_station_codes ?? [],
    matchedStationCount: result.rows[0]?.matched_station_count ?? 0
  };
};

export const getPrismCoverageByGroupCode = async (groupCode: string, projectScope: string[] | null = null) => {
  const scope = buildPrismScopeCondition(projectScope, 2);

  const query = `
    SELECT
      po.station_code,
      po.station_id,
      po.source_file,
      p.code AS prism_code
    FROM prism_observations po
    INNER JOIN prisms p ON p.id = po.prism_id
    WHERE
      po.station_code = $1
      OR starts_with(po.station_code, $1 || '.')
      ${scope.clause}
    ORDER BY po.station_code ASC, p.code ASC
  `;

  const result = await pool.query<{
    prism_code: string;
    source_file: string;
    station_code: string | null;
    station_id: string | null;
  }>(query, [groupCode, ...scope.params]);

  const allPrisms = Array.from(new Set(result.rows.map((row) => row.prism_code))).sort();
  const stationCodes = Array.from(
    new Set(result.rows.map((row) => row.station_code).filter((stationCode): stationCode is string => stationCode !== null))
  ).sort();

  return {
    groupCode,
    stationCodes,
    stations: stationCodes.map((stationCode) => {
      const stationRows = result.rows.filter((row) => row.station_code === stationCode);
      const visiblePrisms = Array.from(new Set(stationRows.map((row) => row.prism_code))).sort();
      const visiblePrismSet = new Set(visiblePrisms);

      return {
        missingPrisms: allPrisms.filter((prismCode) => !visiblePrismSet.has(prismCode)),
        sourceFiles: Array.from(new Set(stationRows.map((row) => row.source_file))).sort(),
        stationCode,
        stationId: stationRows.find((row) => row.station_id)?.station_id ?? null,
        visiblePrisms
      };
    }),
    totalUniquePrisms: allPrisms.length
  };
};
