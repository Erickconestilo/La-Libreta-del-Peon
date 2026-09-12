import { pool } from '../db/pool.js';
type ProjectAccessLevel = 'read' | 'write';

export const getUserProjectIds = async (userId: string) => {
  const result = await pool.query<{ project_id: string }>(
    `
      SELECT
        project_id
      FROM project_memberships
      WHERE user_id = $1
        AND is_active = TRUE
      ORDER BY project_id
    `,
    [userId]
  );

  return result.rows.map((row) => row.project_id);
};

export const getUserProjectAccess = async (userId: string) => {
  const result = await pool.query<{ project_id: string; access_level: ProjectAccessLevel }>(
    `
      SELECT project_id, access_level
      FROM project_memberships
      WHERE user_id = $1
        AND is_active = TRUE
      ORDER BY project_id
    `,
    [userId]
  );

  return Object.fromEntries(result.rows.map((row) => [row.project_id, row.access_level]));
};
