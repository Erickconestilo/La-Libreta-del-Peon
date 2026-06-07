import type { PoolClient } from 'pg';

import { pool } from '../db/pool.js';
import { getPublicPhotoUrl } from '../lib/photo-storage.js';
import { createChangeLog } from './change-logs.model.js';

type ProjectScope = {
  params: unknown[];
  clause: string;
};

type CreateProjectInput = {
  code?: string | null;
  description?: string | null;
  isActive?: boolean;
  name: string;
};

const buildProjectScopeCondition = (projectIds: string[] | null, baseOffset: number): ProjectScope => {
  if (projectIds === null) {
    return { params: [], clause: '' };
  }

  if (projectIds.length === 0) {
    return { params: [], clause: 'AND 1=0' };
  }

  return {
    params: [projectIds],
    clause: `AND p.id = ANY($${baseOffset}::uuid[])`
  };
};

const mapProjectRow = (row: Record<string, unknown>) => ({
  code: row.code,
  createdAt: row.created_at,
  description: row.description,
  id: row.id,
  imageUrl: row.image_url,
  isActive: row.is_active,
  name: row.name,
  stationCount: Number(row.station_count ?? 0),
  updatedAt: row.updated_at
});

const slugifyProjectCode = (value: string) => {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

  return slug || `obra-${Date.now()}`;
};

const resolveUniqueProjectCode = async (client: PoolClient, input: CreateProjectInput) => {
  const baseCode = slugifyProjectCode(input.code?.trim() || input.name);

  for (let index = 0; index < 25; index += 1) {
    const candidate = index === 0 ? baseCode : `${baseCode}-${index + 1}`;
    const result = await client.query('SELECT 1 FROM projects WHERE code = $1 LIMIT 1', [candidate]);

    if (result.rowCount === 0) {
      return candidate;
    }
  }

  return `${baseCode}-${Date.now()}`;
};

export const listProjects = async (projectScope: string[] | null = null) => {
  const scope = buildProjectScopeCondition(projectScope, 1);

  const result = await pool.query(`
    SELECT
      p.id,
      p.code,
      p.name,
      p.description,
      p.image_url,
      p.is_active,
      p.created_at,
      p.updated_at,
      COUNT(s.id)::int AS station_count
    FROM projects p
    LEFT JOIN stations s ON s.project_id = p.id
    WHERE 1=1
    ${scope.clause}
    GROUP BY p.id
    ORDER BY p.is_active DESC, p.name ASC
  `, scope.params);

  return result.rows.map(mapProjectRow);
};

export const getProjectById = async (projectId: string, projectScope: string[] | null = null) => {
  const scope = buildProjectScopeCondition(projectScope, 2);

  const result = await pool.query(
    `
      SELECT
        p.id,
        p.code,
        p.name,
        p.description,
        p.image_url,
        p.is_active,
        p.created_at,
        p.updated_at,
        COUNT(s.id)::int AS station_count
      FROM projects p
      LEFT JOIN stations s ON s.project_id = p.id
      WHERE p.id = $1
      ${scope.clause}
      GROUP BY p.id
    `,
    [projectId, ...scope.params]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapProjectRow(result.rows[0]);
};

export const createProject = async (input: CreateProjectInput, createdBy: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const code = await resolveUniqueProjectCode(client, input);
    const result = await client.query(
      `
        INSERT INTO projects (code, name, description, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [
        code,
        input.name.trim(),
        input.description?.trim() ? input.description.trim() : null,
        input.isActive ?? true
      ]
    );
    const projectId = result.rows[0].id as string;

    await createChangeLog(
      {
        entityId: projectId,
        entityType: 'project',
        fieldChanged: 'created',
        newValue: input.name.trim(),
        oldValue: null
      },
      createdBy,
      client
    );

    await client.query('COMMIT');

    return getProjectById(projectId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateProjectPhoto = async (
  projectId: string,
  storagePath: string | null,
  changedBy: string,
  projectScope: string[] | null = null
) => {
  const scope = buildProjectScopeCondition(projectScope, 2);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
        SELECT p.id, p.image_url
        FROM projects p
        WHERE p.id = $1
        ${scope.clause}
        FOR UPDATE
      `,
      [projectId, ...scope.params]
    );

    if (currentResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const imageUrl = storagePath ? getPublicPhotoUrl(storagePath) : null;
    const oldImageUrl = currentResult.rows[0].image_url as string | null;

    await client.query(
      `
        UPDATE projects
        SET image_url = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [projectId, imageUrl]
    );

    if (oldImageUrl !== imageUrl) {
      await createChangeLog(
        {
          entityId: projectId,
          entityType: 'project',
          fieldChanged: 'image_url',
          newValue: imageUrl,
          oldValue: oldImageUrl
        },
        changedBy,
        client
      );
    }

    await client.query('COMMIT');

    return getProjectById(projectId, projectScope);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
