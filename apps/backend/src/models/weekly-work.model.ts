import type { PoolClient } from 'pg';

import { pool } from '../db/pool.js';
import { AppError } from '../lib/app-error.js';
import type {
  ValidatedCreateWeeklyWorkItemInput,
  ValidatedUpdateWeeklyWorkItemInput
} from '../utils/weekly-work-validation.js';

type ProjectScope = string[] | null;

const buildProjectScope = (projectScope: ProjectScope, alias: string, offset: number) => {
  if (projectScope === null) return { clause: '', params: [] as unknown[] };
  if (projectScope.length === 0) return { clause: 'AND 1=0', params: [] as unknown[] };
  return {
    clause: `AND ${alias}.project_id = ANY($${offset}::uuid[])`,
    params: [projectScope] as unknown[]
  };
};

const mapWeeklyWorkRow = (row: Record<string, unknown>) => ({
  category: row.category,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  createdBy: row.created_by,
  id: row.id,
  notes: row.notes,
  projectId: row.project_id,
  status: row.status,
  title: row.title,
  updatedAt: row.updated_at,
  version: row.version,
  workDate: row.work_date
});

const addDays = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const normalizeText = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const isEquivalentWeeklyWorkReplay = (
  row: Record<string, unknown>,
  projectId: string,
  input: ValidatedCreateWeeklyWorkItemInput,
  createdBy: string
) =>
  row.project_id === projectId &&
  row.created_by === createdBy &&
  row.work_date === input.workDate &&
  row.title === input.title.trim() &&
  row.category === input.category &&
  row.status === input.status &&
  normalizeText(row.notes) === normalizeText(input.notes);

export const listWeeklyWorkItems = async (
  projectId: string,
  weekStart: string,
  projectScope: ProjectScope
) => {
  const scope = buildProjectScope(projectScope, 'pwwi', 4);
  const result = await pool.query(
    `
      SELECT pwwi.*
      FROM project_weekly_work_items pwwi
      WHERE pwwi.project_id = $1
        AND pwwi.work_date BETWEEN $2::date AND $3::date
        AND pwwi.deleted_at IS NULL
        ${scope.clause}
      ORDER BY pwwi.work_date ASC, pwwi.created_at ASC, pwwi.id ASC
    `,
    [projectId, weekStart, addDays(weekStart, 6), ...scope.params]
  );
  return result.rows.map(mapWeeklyWorkRow);
};

const loadProjectForWrite = async (client: PoolClient, projectId: string, projectScope: ProjectScope) => {
  if (projectScope !== null && !projectScope.includes(projectId)) return false;
  const result = await client.query('SELECT id FROM projects WHERE id = $1 AND is_active = TRUE LIMIT 1', [projectId]);
  return (result.rowCount ?? 0) > 0;
};

export const createWeeklyWorkItem = async (
  projectId: string,
  input: ValidatedCreateWeeklyWorkItemInput,
  createdBy: string,
  projectScope: ProjectScope
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!(await loadProjectForWrite(client, projectId, projectScope))) {
      await client.query('ROLLBACK');
      return null;
    }

    const insert = await client.query(
      `
        INSERT INTO project_weekly_work_items (
          project_id, work_date, title, category, status, notes,
          created_by, client_request_id, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $5 = 'done' THEN NOW() ELSE NULL END)
        ON CONFLICT (created_by, client_request_id) DO NOTHING
        RETURNING *
      `,
      [
        projectId,
        input.workDate,
        input.title.trim(),
        input.category,
        input.status,
        input.notes?.trim() || null,
        createdBy,
        input.clientRequestId
      ]
    );

    if ((insert.rowCount ?? 0) > 0) {
      await client.query('COMMIT');
      return { created: true, item: mapWeeklyWorkRow(insert.rows[0]) };
    }

    const replay = await client.query(
      `SELECT * FROM project_weekly_work_items WHERE created_by = $1 AND client_request_id = $2 LIMIT 1`,
      [createdBy, input.clientRequestId]
    );
    if ((replay.rowCount ?? 0) === 0) {
      throw new AppError('Weekly work insert produced no row', 500, 'WEEKLY_WORK_INSERT_INCONSISTENT');
    }
    if (!isEquivalentWeeklyWorkReplay(replay.rows[0], projectId, input, createdBy)) {
      throw new AppError(
        'Client request id already used for different weekly work',
        409,
        'CLIENT_REQUEST_ID_CONFLICT'
      );
    }
    await client.query('COMMIT');
    return { created: false, item: mapWeeklyWorkRow(replay.rows[0]) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateWeeklyWorkItem = async (
  projectId: string,
  itemId: string,
  input: ValidatedUpdateWeeklyWorkItemInput,
  projectScope: ProjectScope
) => {
  const scope = buildProjectScope(projectScope, 'pwwi', 3);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `
        SELECT pwwi.*
        FROM project_weekly_work_items pwwi
        WHERE pwwi.id = $1 AND pwwi.project_id = $2 AND pwwi.deleted_at IS NULL
          ${scope.clause}
        FOR UPDATE
      `,
      [itemId, projectId, ...scope.params]
    );
    if ((current.rowCount ?? 0) === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    if (Number(current.rows[0].version) !== input.version) {
      throw new AppError('Weekly work item changed since it was loaded', 409, 'WEEKLY_WORK_VERSION_CONFLICT');
    }

    const row = current.rows[0];
    const nextStatus = input.status ?? row.status;
    const completedAt = nextStatus === 'done' ? row.completed_at ?? new Date() : null;
    const updated = await client.query(
      `
        UPDATE project_weekly_work_items
        SET work_date = $3,
            title = $4,
            category = $5,
            status = $6,
            notes = $7,
            completed_at = $8,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $1 AND project_id = $2
        RETURNING *
      `,
      [
        itemId,
        projectId,
        input.workDate ?? row.work_date,
        input.title?.trim() ?? row.title,
        input.category ?? row.category,
        nextStatus,
        input.notes === undefined ? row.notes : input.notes?.trim() || null,
        completedAt
      ]
    );
    await client.query('COMMIT');
    return mapWeeklyWorkRow(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteWeeklyWorkItem = async (
  projectId: string,
  itemId: string,
  version: number,
  deletedBy: string,
  projectScope: ProjectScope
) => {
  const scope = buildProjectScope(projectScope, 'pwwi', 3);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `
        SELECT pwwi.*
        FROM project_weekly_work_items pwwi
        WHERE pwwi.id = $1 AND pwwi.project_id = $2 AND pwwi.deleted_at IS NULL
          ${scope.clause}
        FOR UPDATE
      `,
      [itemId, projectId, ...scope.params]
    );
    if ((current.rowCount ?? 0) === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const row = current.rows[0];
    if (Number(row.version) !== version) {
      throw new AppError('Weekly work item changed since it was loaded', 409, 'WEEKLY_WORK_VERSION_CONFLICT');
    }
    if (row.status !== 'planned') {
      throw new AppError(
        'Only pending planned work can be removed',
        409,
        'WEEKLY_WORK_DELETE_NOT_ALLOWED'
      );
    }
    await client.query(
      `
        UPDATE project_weekly_work_items
        SET deleted_at = NOW(), deleted_by = $3, version = version + 1, updated_at = NOW()
        WHERE id = $1 AND project_id = $2
      `,
      [itemId, projectId, deletedBy]
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
