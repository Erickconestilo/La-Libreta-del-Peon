import type { QueryResultRow } from 'pg';

import { pool } from '../db/pool.js';
import { AppError } from '../lib/app-error.js';
import { createChangeLog } from './change-logs.model.js';
import type { ValidatedCreateIncidentInput } from '../utils/incidents-validation.js';

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
  status
}: {
  limit?: number | null;
  stationId?: string | null;
  status?: 'open' | 'resolved' | null;
} = {}) => {
  const safeLimit = Math.min(Math.max(limit ?? 50, 1), 100);
  const result = await pool.query(
    `
      SELECT
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
      FROM incidents
      WHERE ($1::uuid IS NULL OR station_id = $1::uuid)
        AND ($2::text IS NULL OR status = $2::text)
      ORDER BY reported_at DESC, id DESC
      LIMIT $3
    `,
    [stationId ?? null, status ?? null, safeLimit]
  );

  return result.rows.map(mapIncidentRow);
};

export const createIncident = async (input: ValidatedCreateIncidentInput, reportedBy: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (input.stationId) {
      const stationResult = await client.query('SELECT id FROM stations WHERE id = $1', [input.stationId]);

      if (stationResult.rowCount === 0) {
        throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
      }
    }

    if (input.prismId) {
      const prismResult = await client.query('SELECT id FROM prisms WHERE id = $1', [input.prismId]);

      if (prismResult.rowCount === 0) {
        throw new AppError('Prism not found', 404, 'PRISM_NOT_FOUND');
      }
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
