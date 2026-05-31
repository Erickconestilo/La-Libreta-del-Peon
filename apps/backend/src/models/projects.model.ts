import { pool } from '../db/pool.js';
import { getPublicPhotoUrl } from '../lib/photo-storage.js';
import { createChangeLog } from './change-logs.model.js';

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

export const listProjects = async () => {
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
    GROUP BY p.id
    ORDER BY p.is_active DESC, p.name ASC
  `);

  return result.rows.map(mapProjectRow);
};

export const getProjectById = async (projectId: string) => {
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
      GROUP BY p.id
    `,
    [projectId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapProjectRow(result.rows[0]);
};

export const updateProjectPhoto = async (
  projectId: string,
  storagePath: string | null,
  changedBy: string
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
        SELECT id, image_url
        FROM projects
        WHERE id = $1
        FOR UPDATE
      `,
      [projectId]
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

    return getProjectById(projectId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
