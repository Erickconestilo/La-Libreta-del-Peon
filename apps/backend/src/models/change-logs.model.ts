import type { PoolClient, QueryResultRow } from 'pg';

import { pool } from '../db/pool.js';

export type ChangeLogEntityType = 'station' | 'prism' | 'guide_entry';

export interface CreateChangeLogInput {
  entityId: string;
  entityType: ChangeLogEntityType;
  fieldChanged: string;
  newValue: unknown;
  oldValue: unknown;
}

export interface ListChangeLogsFilters {
  changedBy?: string | null;
  entityId?: string | null;
  entityType?: ChangeLogEntityType | null;
  limit?: number | null;
}

type Queryable = Pick<PoolClient, 'query'>;

const serializeChangeValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
};

const mapChangeLogRow = (row: QueryResultRow) => {
  return {
    changedAt: row.changed_at,
    changedBy: row.changed_by,
    changedByUser: row.changed_by_email
      ? {
          email: row.changed_by_email,
          fullName: row.changed_by_full_name,
          role: row.changed_by_role
        }
      : null,
    entityId: row.entity_id,
    entityType: row.entity_type,
    fieldChanged: row.field_changed,
    id: row.id,
    newValue: row.new_value,
    oldValue: row.old_value
  };
};

export const createChangeLog = async (
  input: CreateChangeLogInput,
  changedBy: string,
  client: Queryable = pool
) => {
  const result = await client.query(
    `
      INSERT INTO change_logs (
        entity_type,
        entity_id,
        field_changed,
        old_value,
        new_value,
        changed_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [
      input.entityType,
      input.entityId,
      input.fieldChanged,
      serializeChangeValue(input.oldValue),
      serializeChangeValue(input.newValue),
      changedBy
    ]
  );

  return result.rows[0].id as string;
};

export const createChangeLogs = async (
  inputs: CreateChangeLogInput[],
  changedBy: string,
  client: Queryable = pool
) => {
  for (const input of inputs) {
    await createChangeLog(input, changedBy, client);
  }
};

export const listChangeLogs = async (filters: ListChangeLogsFilters = {}) => {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);

  const result = await pool.query(
    `
      SELECT
        cl.id,
        cl.entity_type,
        cl.entity_id,
        cl.field_changed,
        cl.old_value,
        cl.new_value,
        cl.changed_by,
        cl.changed_at,
        u.email AS changed_by_email,
        u.full_name AS changed_by_full_name,
        u.role AS changed_by_role
      FROM change_logs cl
      LEFT JOIN users u ON u.id = cl.changed_by
      WHERE ($1::text IS NULL OR cl.entity_type = $1::text)
        AND ($2::uuid IS NULL OR cl.entity_id = $2::uuid)
        AND ($3::uuid IS NULL OR cl.changed_by = $3::uuid)
      ORDER BY cl.changed_at DESC, cl.id DESC
      LIMIT $4
    `,
    [filters.entityType ?? null, filters.entityId ?? null, filters.changedBy ?? null, limit]
  );

  return result.rows.map(mapChangeLogRow);
};
