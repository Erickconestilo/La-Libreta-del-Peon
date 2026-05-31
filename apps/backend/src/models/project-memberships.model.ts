import { pool } from '../db/pool.js';

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
