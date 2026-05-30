import { Pool } from 'pg';

import { loadedEnvPath } from '../lib/load-env.js';

if (!process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL must be defined in ${loadedEnvPath}`);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const checkDatabaseConnection = async () => {
  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
};
