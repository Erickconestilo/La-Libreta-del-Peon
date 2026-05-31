import { pool } from '../db/pool.js';
import { createChangeLog, createChangeLogs } from './change-logs.model.js';
import type { CreateGuideEntryInput, UpdateGuideEntryInput } from '../utils/guide-validation.js';

const mapGuideRow = (row: Record<string, unknown>) => {
  return {
    body: row.body,
    category: row.category,
    createdAt: row.created_at,
    createdBy: row.created_by,
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by
  };
};

export const listGuideEntries = async (category?: string | null) => {
  const query = `
    SELECT
      id,
      title,
      body,
      category,
      created_by,
      updated_by,
      created_at,
      updated_at
    FROM guide_entries
    WHERE ($1::text IS NULL OR category = $1::text)
    ORDER BY category ASC, updated_at DESC, title ASC
  `;

  const result = await pool.query(query, [category ?? null]);

  return result.rows.map(mapGuideRow);
};

export const getGuideEntryById = async (guideEntryId: string) => {
  const result = await pool.query(
    `
      SELECT
        id,
        title,
        body,
        category,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM guide_entries
      WHERE id = $1
    `,
    [guideEntryId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapGuideRow(result.rows[0]);
};

export const createGuideEntry = async (input: CreateGuideEntryInput, userId: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        INSERT INTO guide_entries (
          title,
          body,
          category,
          created_by,
          updated_by
        )
        VALUES ($1, $2, $3, $4, $4)
        RETURNING id
      `,
      [input.title, input.body, input.category, userId]
    );

    const guideEntryId = result.rows[0].id as string;

    await createChangeLog(
      {
        entityId: guideEntryId,
        entityType: 'guide_entry',
        fieldChanged: 'created',
        newValue: {
          category: input.category,
          title: input.title
        },
        oldValue: null
      },
      userId,
      client
    );

    await client.query('COMMIT');

    return guideEntryId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateGuideEntry = async (
  guideEntryId: string,
  input: UpdateGuideEntryInput,
  userId: string
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
        SELECT
          id,
          title,
          body,
          category,
          created_by,
          updated_by,
          created_at,
          updated_at
        FROM guide_entries
        WHERE id = $1
        FOR UPDATE
      `,
      [guideEntryId]
    );

    if (currentResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const currentEntry = mapGuideRow(currentResult.rows[0]);
    const nextEntry = {
      body: input.body ?? currentEntry.body,
      category: input.category ?? currentEntry.category,
      title: input.title ?? currentEntry.title
    };

    await client.query(
      `
        UPDATE guide_entries
        SET
          title = $2,
          body = $3,
          category = $4,
          updated_by = $5,
          updated_at = NOW()
        WHERE id = $1
      `,
      [guideEntryId, nextEntry.title, nextEntry.body, nextEntry.category, userId]
    );

    const changes = [
      {
        entityId: guideEntryId,
        entityType: 'guide_entry' as const,
        fieldChanged: 'title',
        newValue: nextEntry.title,
        oldValue: currentEntry.title
      },
      {
        entityId: guideEntryId,
        entityType: 'guide_entry' as const,
        fieldChanged: 'body',
        newValue: nextEntry.body,
        oldValue: currentEntry.body
      },
      {
        entityId: guideEntryId,
        entityType: 'guide_entry' as const,
        fieldChanged: 'category',
        newValue: nextEntry.category,
        oldValue: currentEntry.category
      }
    ].filter((change) => change.oldValue !== change.newValue);

    await createChangeLogs(changes, userId, client);
    await client.query('COMMIT');

    return getGuideEntryById(guideEntryId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteGuideEntry = async (guideEntryId: string, userId: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
        SELECT
          id,
          title,
          body,
          category
        FROM guide_entries
        WHERE id = $1
        FOR UPDATE
      `,
      [guideEntryId]
    );

    if (currentResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query('DELETE FROM guide_entries WHERE id = $1', [guideEntryId]);

    await createChangeLog(
      {
        entityId: guideEntryId,
        entityType: 'guide_entry',
        fieldChanged: 'deleted',
        newValue: null,
        oldValue: {
          category: currentResult.rows[0].category,
          title: currentResult.rows[0].title
        }
      },
      userId,
      client
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
