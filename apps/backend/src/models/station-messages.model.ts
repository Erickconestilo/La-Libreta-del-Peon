import type { QueryResultRow } from 'pg';

import { pool } from '../db/pool.js';
import { AppError } from '../lib/app-error.js';
import { createChangeLog } from './change-logs.model.js';

type StationMessageScope = {
  params: unknown[];
  clause: string;
};

const buildStationScopeCondition = (projectIds: string[] | null, baseOffset: number): StationMessageScope => {
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

const mapStationMessageRow = (row: QueryResultRow) => {
  return {
    body: row.body,
    createdAt: row.created_at,
    createdBy: row.created_by,
    createdByUser: row.created_by_email
      ? {
          email: row.created_by_email,
          fullName: row.created_by_full_name,
          role: row.created_by_role
        }
      : null,
    id: row.id,
    station: row.station_name
      ? {
          id: row.station_id,
          name: row.station_name,
          project: row.project_code
            ? {
                code: row.project_code,
                name: row.project_name
              }
            : null
        }
      : null,
    stationId: row.station_id
  };
};

export const listStationMessages = async (
  stationId: string,
  limit = 50,
  projectScope: string[] | null = null
) => {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const scope = buildStationScopeCondition(projectScope, 3);

  const result = await pool.query(
    `
      SELECT
        sm.id,
        sm.station_id,
        sm.body,
        sm.created_by,
        sm.created_at,
        s.name AS station_name,
        pr.code AS project_code,
        pr.name AS project_name,
        u.email AS created_by_email,
        u.full_name AS created_by_full_name,
        u.role AS created_by_role
      FROM station_messages sm
      INNER JOIN stations s ON s.id = sm.station_id
      LEFT JOIN projects pr ON pr.id = s.project_id
      LEFT JOIN users u ON u.id = sm.created_by
      WHERE sm.station_id = $1
      ${scope.clause}
      ORDER BY sm.created_at DESC, sm.id DESC
      LIMIT $2
    `,
    [stationId, safeLimit, ...scope.params]
  );

  return result.rows.map(mapStationMessageRow);
};

const getStationMessageById = async (
  messageId: string,
  projectScope: string[] | null = null
) => {
  const scope = buildStationScopeCondition(projectScope, 2);

  const result = await pool.query(
    `
      SELECT
        sm.id,
        sm.station_id,
        sm.body,
        sm.created_by,
        sm.created_at,
        s.name AS station_name,
        pr.code AS project_code,
        pr.name AS project_name,
        u.email AS created_by_email,
        u.full_name AS created_by_full_name,
        u.role AS created_by_role
      FROM station_messages sm
      LEFT JOIN users u ON u.id = sm.created_by
      INNER JOIN stations s ON s.id = sm.station_id
      LEFT JOIN projects pr ON pr.id = s.project_id
      WHERE sm.id = $1
      ${scope.clause}
    `,
    [messageId, ...scope.params]
  );

  return result.rowCount === 0 ? null : mapStationMessageRow(result.rows[0]);
};

export const listRecentStationMessages = async (
  limit = 100,
  projectScope: string[] | null = null
) => {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const scope = buildStationScopeCondition(projectScope, 2);

  const result = await pool.query(
    `
      SELECT
        sm.id,
        sm.station_id,
        sm.body,
        sm.created_by,
        sm.created_at,
        s.name AS station_name,
        pr.code AS project_code,
        pr.name AS project_name,
        u.email AS created_by_email,
        u.full_name AS created_by_full_name,
        u.role AS created_by_role
      FROM station_messages sm
      INNER JOIN stations s ON s.id = sm.station_id
      LEFT JOIN projects pr ON pr.id = s.project_id
      LEFT JOIN users u ON u.id = sm.created_by
      WHERE 1=1
      ${scope.clause}
      ORDER BY sm.created_at DESC, sm.id DESC
      LIMIT $1
    `,
    [safeLimit, ...scope.params]
  );

  return result.rows.map(mapStationMessageRow);
};

export const createStationMessage = async (
  stationId: string,
  body: string,
  createdBy: string,
  projectScope: string[] | null = null
) => {
  const scope = buildStationScopeCondition(projectScope, 2);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const stationResult = await client.query(
      `
        SELECT s.id
        FROM stations s
        WHERE s.id = $1
        ${scope.clause}
      `,
      [stationId, ...scope.params]
    );

    if (stationResult.rowCount === 0) {
      throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
    }

    const result = await client.query(
      `
        INSERT INTO station_messages (
          station_id,
          body,
          created_by
        )
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [stationId, body, createdBy]
    );

    await createChangeLog(
      {
        entityId: stationId,
        entityType: 'station',
        fieldChanged: 'station_message_added',
        newValue: body,
        oldValue: null
      },
      createdBy,
      client
    );

    await client.query('COMMIT');

    return getStationMessageById(result.rows[0].id as string, projectScope);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
