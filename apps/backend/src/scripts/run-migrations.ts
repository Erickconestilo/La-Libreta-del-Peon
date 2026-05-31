import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from '../db/pool.js';
import { assertWriteAllowed } from './safety.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDirectory = path.resolve(__dirname, '../../migrations');

const ensureMigrationsTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await pool.query(query);
};

const getAppliedMigrations = async () => {
  const result = await pool.query<{
    filename: string;
  }>('SELECT filename FROM schema_migrations');

  return new Set(result.rows.map((row) => row.filename));
};

const loadMigrationFiles = async () => {
  const entries = await fs.readdir(migrationsDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((first, second) => first.localeCompare(second));
};

const runMigrations = async () => {
  assertWriteAllowed('run-migrations');

  await ensureMigrationsTable();

  const appliedMigrations = await getAppliedMigrations();
  const migrationFiles = await loadMigrationFiles();

  for (const migrationFile of migrationFiles) {
    if (appliedMigrations.has(migrationFile)) {
      console.log(`Skipping already applied migration: ${migrationFile}`);
      continue;
    }

    const migrationPath = path.join(migrationsDirectory, migrationFile);
    const sql = await fs.readFile(migrationPath, 'utf8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [migrationFile]);
      await client.query('COMMIT');
      console.log(`Applied migration: ${migrationFile}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

runMigrations()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
