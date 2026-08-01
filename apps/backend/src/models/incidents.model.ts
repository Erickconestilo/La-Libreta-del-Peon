import type { QueryResultRow } from 'pg';

import { pool } from '../db/pool.js';
import { AppError } from '../lib/app-error.js';
import { createChangeLog } from './change-logs.model.js';
import type { ValidatedCreateIncidentInput } from '../utils/incidents-validation.js';

type IncidentScope = {
  params: unknown[];
  clause: string;
};

const buildIncidentScopeCondition = (projectScope: string[] | null, baseOffset: number): IncidentScope => {
  if (projectScope === null) {
    return { params: [], clause: '' };
  }

  if (projectScope.length === 0) {
    return { params: [], clause: 'AND 1=0' };
  }

  return {
    params: [projectScope],
    clause: `AND (s.project_id = ANY($${baseOffset}::uuid[]) OR p.project_id = ANY($${baseOffset}::uuid[]))`
  };
};

export const buildIncidentResourceScopeCondition = (
  projectScope: string[] | null,
  tableAlias: string,
  baseOffset: number
): IncidentScope => {
  if (projectScope === null) {
    return { params: [], clause: '' };
  }

  if (projectScope.length === 0) {
    return { params: [], clause: 'AND 1=0' };
  }

  return {
    params: [projectScope],
    clause: `AND ${tableAlias}.project_id = ANY($${baseOffset}::uuid[])`
  };
};

const mapIncidentRow = (row: QueryResultRow) => {
  return {
    description: row.description,
    id: row.id,
    photoUrl: row.photo_url,
    prismId: row.prism_id,
    reportedAt: row.reported_at,
    reportedBy: row.reported_by,
    stationId: row.station_id,
    status: row.status,
    suggestion: row.suggestion,
    type: row.type,
    updatedAt: row.updated_at
  };
};

export const listIncidents = async ({
  limit = 50,
  stationId,
  status,
  projectScope = null
}: {
  limit?: number | null;
  stationId?: string | null;
  status?: 'open' | 'resolved' | null;
  projectScope?: string[] | null;
} = {}) => {
  const safeLimit = Math.min(Math.max(limit ?? 50, 1), 100);
  const scope = buildIncidentScopeCondition(projectScope, 4);

  const result = await pool.query(
    `
      SELECT
        i.id,
        i.station_id,
        i.prism_id,
        i.type,
        i.description,
        i.photo_url,
        i.reported_by,
        i.reported_at,
        i.status,
        i.suggestion,
        i.updated_at
      FROM incidents i
      LEFT JOIN stations s ON s.id = i.station_id
      LEFT JOIN prisms p ON p.id = i.prism_id
      WHERE ($1::uuid IS NULL OR i.station_id = $1::uuid)
        AND ($2::text IS NULL OR i.status = $2::text)
        ${scope.clause}
      ORDER BY i.reported_at DESC, i.id DESC
      LIMIT $3
    `,
    [stationId ?? null, status ?? null, safeLimit, ...scope.params]
  );

  return result.rows.map(mapIncidentRow);
};

export const createIncident = async (
  input: ValidatedCreateIncidentInput,
  reportedBy: string,
  projectScope: string[] | null = null
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let stationProjectId: string | null = null;
    let prismProjectId: string | null = null;

    if (input.stationId) {
      const scope = buildIncidentResourceScopeCondition(projectScope, 's', 2);
      const stationResult = await client.query(
        `
          SELECT s.id, s.project_id
          FROM stations s
          WHERE s.id = $1
          ${scope.clause}
          FOR UPDATE
        `,
        [input.stationId, ...scope.params]
      );

      if (stationResult.rowCount === 0) {
        throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
      }

      stationProjectId = stationResult.rows[0].project_id as string | null;
    }

    if (input.prismId) {
      const scope = buildIncidentResourceScopeCondition(projectScope, 'p', 2);
      const prismResult = await client.query(
        `
          SELECT p.id, p.project_id
          FROM prisms p
          WHERE p.id = $1
          ${scope.clause}
          FOR UPDATE
        `,
        [input.prismId, ...scope.params]
      );

      if (prismResult.rowCount === 0) {
        throw new AppError('Prism not found', 404, 'PRISM_NOT_FOUND');
      }

      prismProjectId = prismResult.rows[0].project_id as string | null;
    }

    if (stationProjectId && prismProjectId && stationProjectId !== prismProjectId) {
      throw new AppError(
        'Station and prism must belong to the same project',
        400,
        'INCIDENT_SCOPE_MISMATCH'
      );
    }

    const result = await client.query(
      `
        INSERT INTO incidents (
          station_id,
          prism_id,
          type,
          description,
          photo_url,
          reported_by,
          status,
          suggestion
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)
        RETURNING
          id,
          station_id,
          prism_id,
          type,
          description,
          photo_url,
          reported_by,
          reported_at,
          status,
          suggestion,
          updated_at
      `,
      [
        input.stationId,
        input.prismId,
        input.type,
        input.description,
        input.photoUrl,
        reportedBy,
        input.suggestion ? JSON.stringify(input.suggestion) : null
      ]
    );

    const incident = mapIncidentRow(result.rows[0]);

    if (input.stationId) {
      await createChangeLog(
        {
          entityId: input.stationId,
          entityType: 'station',
          fieldChanged: input.suggestion?.kind === 'new_station' ? 'provisional_station_proposed' : 'incident_created',
          newValue: {
            description: input.description,
            incidentId: incident.id,
            suggestion: input.suggestion
          },
          oldValue: null
        },
        reportedBy,
        client
      );
    }

    await client.query('COMMIT');

    return incident;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
