/**
 * Script para extraer políticas RLS reales de Supabase (solo lectura)
 * Genera SQL de CREATE POLICY basado en las políticas activas
 */

import '../lib/load-env.js';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

interface PolicyRow {
  schemaname: string;
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string[] | string; // puede venir como string o array
  cmd: string;
  qual: string | null;
  with_check: string | null;
}

async function extractPolicies(tableNames: string[]) {
  console.log('=== EXTRACCIÓN DE POLÍTICAS RLS ===');
  console.log(`Tablas objetivo: ${tableNames.join(', ')}`);
  console.log();

  const result = await pool.query<PolicyRow>(`
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY($1::text[])
    ORDER BY tablename, policyname
  `, [tableNames]);

  if (result.rows.length === 0) {
    console.log('No se encontraron políticas para las tablas especificadas.');
    await pool.end();
    return;
  }

  console.log(`Total de políticas encontradas: ${result.rows.length}`);
  console.log();

  const byTable = new Map<string, PolicyRow[]>();
  for (const row of result.rows) {
    if (!byTable.has(row.tablename)) {
      byTable.set(row.tablename, []);
    }
    byTable.get(row.tablename)!.push(row);
  }

  console.log('-- =====================================================');
  console.log('-- Políticas RLS extraídas de Supabase (solo lectura)');
  console.log('-- Fecha:', new Date().toISOString());
  console.log('-- =====================================================');
  console.log();

  for (const [tableName, policies] of byTable.entries()) {
    console.log(`-- Tabla: ${tableName}`);
    console.log(`-- Políticas: ${policies.length}`);
    console.log();

    for (const policy of policies) {
      const cmdMap: Record<string, string> = {
        'r': 'SELECT',
        'a': 'INSERT',
        'w': 'UPDATE',
        'd': 'DELETE',
        '*': 'ALL'
      };

      const command = cmdMap[policy.cmd] || policy.cmd;
      const permissive = policy.permissive === 'PERMISSIVE' ? 'AS PERMISSIVE' : 'AS RESTRICTIVE';

      // roles puede venir como string "{role1,role2}" o array ["role1", "role2"]
      let rolesStr: string;
      if (typeof policy.roles === 'string') {
        rolesStr = policy.roles.replace(/[{}]/g, ''); // "{public}" -> "public"
      } else {
        rolesStr = policy.roles.join(', ');
      }

      console.log(`CREATE POLICY "${policy.policyname}"`);
      console.log(`  ON public.${tableName}`);
      console.log(`  ${permissive}`);
      console.log(`  FOR ${command}`);
      console.log(`  TO ${rolesStr}`);

      if (policy.qual) {
        console.log(`  USING (${policy.qual})`);
      }

      if (policy.with_check) {
        console.log(`  WITH CHECK (${policy.with_check})`);
      }

      console.log(';');
      console.log();
    }

    console.log();
  }

  console.log('-- =====================================================');
  console.log('-- FIN DE POLÍTICAS RLS');
  console.log('-- =====================================================');

  await pool.end();
}

const OBRAS_TABLES = [
  'obras',
  'campanas',
  'jornadas',
  'sensores',
  'mediciones',
  'estacionamientos'
];

extractPolicies(OBRAS_TABLES).catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
