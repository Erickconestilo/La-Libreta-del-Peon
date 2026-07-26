/**
 * Script de inventario de esquema Supabase (solo lectura)
 * Parte de Fase 0 — reconciliación de estado antes de rework
 *
 * Lista todas las tablas del esquema public con:
 * - Columnas y tipos
 * - Estado RLS
 * - Conteo de filas (via count)
 *
 * Nota: No accede a pg_policy directamente (requiere RPC personalizada).
 * Las políticas RLS se documentarán manualmente desde la UI de Supabase.
 */

import '../lib/load-env.js';
import pg from 'pg';

const { Pool } = pg;

interface TableInfo {
  table_name: string;
  rls_enabled: boolean;
  row_count: number;
  columns: Array<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listAllTables(): Promise<string[]> {
  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  return result.rows.map(r => r.table_name);
}

async function getTableColumns(tableName: string) {
  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  return result.rows;
}

async function checkRLSEnabled(tableName: string): Promise<boolean> {
  const result = await pool.query(`
    SELECT relrowsecurity as rls_enabled
    FROM pg_class
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
    WHERE pg_namespace.nspname = 'public' AND pg_class.relname = $1
  `, [tableName]);

  return result.rows[0]?.rls_enabled ?? false;
}

async function getRowCount(tableName: string): Promise<number> {
  try {
    const result = await pool.query(`SELECT COUNT(*) as count FROM public."${tableName}"`);
    return parseInt(result.rows[0].count, 10);
  } catch {
    return -1;
  }
}

async function inventorySchema() {
  console.log('=== INVENTARIO DE ESQUEMA SUPABASE (topofield) ===');
  console.log('Fecha:', new Date().toISOString());
  console.log();

  const tables = await listAllTables();
  console.log(`Total de tablas encontradas: ${tables.length}`);
  console.log();

  const inventory: TableInfo[] = [];

  for (const tableName of tables) {
    process.stdout.write(`Inspeccionando ${tableName}...`);

    const [columns, rowCount, rlsEnabled] = await Promise.all([
      getTableColumns(tableName),
      getRowCount(tableName),
      checkRLSEnabled(tableName)
    ]);

    inventory.push({
      table_name: tableName,
      rls_enabled: rlsEnabled,
      row_count: rowCount,
      columns: columns ?? []
    });

    console.log(` ✓ (${rowCount} filas, RLS: ${rlsEnabled ? 'ON' : 'OFF'})`);
  }

  console.log();
  console.log('=== RESUMEN POR TABLA ===');
  console.log();

  for (const table of inventory) {
    console.log(`## ${table.table_name}`);
    console.log(`- RLS: ${table.rls_enabled ? 'HABILITADO' : 'DESHABILITADO'}`);
    console.log(`- Filas: ${table.row_count}`);
    console.log(`- Columnas (${table.columns.length}):`);

    for (const col of table.columns) {
      const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}${def}`);
    }

    console.log();
  }

  // Identificar tablas NO versionadas localmente (migraciones 001-014)
  const versionedTables = new Set([
    'users', 'stations', 'prisms', 'guide_entries', 'incidents', 'change_logs',
    'projects', 'station_readings', 'work_sessions', 'capture_logs',
    'prism_observations', 'station_photos', 'station_messages', 'project_memberships',
    'instrument_types', 'control_points', 'monitoring_rounds', 'monitoring_round_points',
    'instrument_readings', 'reading_attachments', 'control_point_thresholds',
    'project_code_catalog', 'project_rules'
  ]);

  const unversionedTables = inventory.filter(t => !versionedTables.has(t.table_name));

  console.log('=== TABLAS NO VERSIONADAS LOCALMENTE (migraciones 001-014) ===');
  console.log(`Total: ${unversionedTables.length}`);
  console.log();

  for (const table of unversionedTables) {
    console.log(`- ${table.table_name} (${table.row_count} filas, RLS: ${table.rls_enabled ? 'ON' : 'OFF'})`);
  }

  console.log();
  console.log('=== MIGRACIONES APLICADAS EN SUPABASE ===');

  try {
    const result = await pool.query(`
      SELECT version
      FROM public.schema_migrations
      ORDER BY version
    `);

    console.log(`Total de versiones: ${result.rows.length}`);

    const localVersions = new Set([
      '001', '002', '003', '004', '005', '006', '007', '008',
      '009', '010', '011', '012', '013', '014'
    ]);

    const unversionedMigrations = result.rows.filter(r => {
      const shortVersion = r.version.toString().substring(0, 3);
      return !localVersions.has(shortVersion);
    });

    console.log();
    console.log('Migraciones en Supabase SIN archivo local:');
    for (const m of unversionedMigrations) {
      console.log(`  - ${m.version}`);
    }
  } catch (err: any) {
    console.log('No se pudo leer schema_migrations:', err.message);
  }

  console.log();
  console.log('=== FIN DEL INVENTARIO ===');

  await pool.end();
}

inventorySchema().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
