/**
 * Script para aplicar migración 016: unify_profiles_into_users
 * Ejecuta paso a paso con diagnóstico
 */

import '../lib/load-env.js';
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration016() {
  console.log('=== APLICANDO MIGRACIÓN 016: unify_profiles_into_users ===\n');

  try {
    // Leer archivo de migración
    const migrationPath = path.join(backendRoot, 'migrations', '016_unify_profiles_into_users.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    console.log('Ejecutando migración...\n');

    // Ejecutar migración completa
    await pool.query(migrationSQL);

    console.log('✅ Migración 016 aplicada exitosamente\n');

    // Verificar resultado
    const {rows: usersCount} = await pool.query('SELECT COUNT(*) as count FROM public.users');
    console.log(`usuarios en users: ${usersCount[0].count}`);

    const {rows: profilesCheck} = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles'
      ) as exists
    `);
    console.log(`tabla profiles existe: ${profilesCheck[0].exists ? 'SÍ' : 'NO (eliminada)'}`);

    // Registrar en schema_migrations
    await pool.query(`
      INSERT INTO public.schema_migrations (filename, executed_at)
      VALUES ('016_unify_profiles_into_users.sql', NOW())
      ON CONFLICT DO NOTHING
    `);

    console.log('\n✅ Migración registrada en schema_migrations');

  } catch (err: any) {
    console.error('\n❌ Error aplicando migración 016:');
    console.error(err.message);
    if (err.detail) console.error('Detalle:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration016().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
