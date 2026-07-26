/**
 * Script para aplicar migración 017: drop_topotask_integration_tables
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

async function applyMigration017() {
  console.log('=== APLICANDO MIGRACIÓN 017: drop_topotask_integration_tables ===\n');

  try {
    // Leer archivo de migración
    const migrationPath = path.join(backendRoot, 'migrations', '017_drop_topotask_integration_tables.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    console.log('Ejecutando migración...\n');

    // Ejecutar migración completa
    await pool.query(migrationSQL);

    console.log('✅ Migración 017 aplicada exitosamente\n');

    // Verificar resultado
    const tables = ['incidencias', 'incidencia_fotos', 'obra_destinatarios', 'envios_correo'];
    for (const table of tables) {
      const {rows} = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) as exists
      `, [table]);
      console.log(`tabla ${table} existe: ${rows[0].exists ? 'SÍ (ERROR)' : 'NO (eliminada)'}`);
    }

    // Registrar en schema_migrations
    await pool.query(`
      INSERT INTO public.schema_migrations (filename, executed_at)
      VALUES ('017_drop_topotask_integration_tables.sql', NOW())
      ON CONFLICT DO NOTHING
    `);

    console.log('\n✅ Migración registrada en schema_migrations');

  } catch (err: any) {
    console.error('\n❌ Error aplicando migración 017:');
    console.error(err.message);
    if (err.detail) console.error('Detalle:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration017().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
