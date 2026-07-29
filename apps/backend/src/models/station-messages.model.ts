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

/**
 * Busca un station_message ya existente por su client_request_id.
 * Se usa cuando el INSERT idempotente de createStationMessage() detecta
 * que ese client_request_id ya se sincronizó antes (reintento del outbox
 * offline tras un timeout de red), para devolver el mensaje ya creado en
 * vez de duplicarlo.
 */
const getStationMessageByClientRequestId = async (
  clientRequestId: string,
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
      WHERE sm.client_request_id = $1
      ${scope.clause}
    `,
    [clientRequestId, ...scope.params]
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
  projectScope: string[] | null = null,
  clientRequestId?: string
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

    // ON CONFLICT DO NOTHING sobre client_request_id: si el móvil reintenta
    // el mismo item del outbox tras un timeout de red (sin saber si el
    // servidor ya lo proceso), esto no crea una fila duplicada. Cuando
    // clientRequestId es undefined, nunca hay conflicto (el índice único es
    // parcial, solo aplica a valores no NULL) y el INSERT se comporta igual
    // que antes.
    const result = await client.query(
      `
        INSERT INTO station_messages (
          station_id,
          body,
          created_by,
          client_request_id
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (client_request_id) WHERE client_request_id IS NOT NULL DO NOTHING
        RETURNING id
      `,
      [stationId, body, createdBy, clientRequestId ?? null]
    );

    if (result.rowCount === 0) {
      // Ya existía (reintento idempotente): no crear un change-log duplicado,
      // simplemente devolver el mensaje que ya se sincronizó antes.
      if (!clientRequestId) {
        // No debería poder pasar (sin clientRequestId nunca hay conflicto),
        // pero si pasa es un estado inconsistente real, no algo a ignorar.
        throw new AppError(
          'Station message insert produced no row without a clientRequestId',
          500,
          'STATION_MESSAGE_INSERT_INCONSISTENT'
        );
      }

      await client.query('COMMIT');

      return getStationMessageByClientRequestId(clientRequestId, projectScope);
    }

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
