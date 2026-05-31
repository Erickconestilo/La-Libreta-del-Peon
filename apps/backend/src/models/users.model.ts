import { pool } from '../db/pool.js';

export const getUserProfileById = async (userId: string) => {
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        full_name,
        role,
        is_active
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    email: row.email as string,
    fullName: row.full_name as string,
    id: row.id as string,
    isActive: row.is_active as boolean,
    role: row.role as 'admin' | 'topografo' | 'visitante'
  };
};
