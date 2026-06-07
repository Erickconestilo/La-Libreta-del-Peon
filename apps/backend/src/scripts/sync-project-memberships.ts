import fs from 'node:fs/promises';
import path from 'node:path';

import { Client } from 'pg';

import { loadedEnvPath } from '../lib/load-env.js';
import { assertWriteAllowed } from './safety.js';

type MatrixRow = {
  email: string;
  projectCodes: string[];
  isActive?: boolean;
};

type MatrixFile = {
  users: MatrixRow[];
};

const matrixPathArg = process.argv[2];
const defaultMatrixPath = path.resolve(process.cwd(), '..', '..', 'data', 'project-memberships.json');
const matrixPath = matrixPathArg ? path.resolve(process.cwd(), matrixPathArg) : defaultMatrixPath;

const requiredEnv = ['DATABASE_URL'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} must be defined in ${loadedEnvPath}`);
  }
}

const toString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const normalizeProjectCode = (value: string) => value.trim().toLowerCase();

const parseProjectCodes = (value: unknown, rowIndex: number) => {
  if (!Array.isArray(value)) {
    throw new Error(`users[${rowIndex}].projectCodes must be an array`);
  }

  return [...new Set(value.map((entry) => normalizeProjectCode(toString(entry))).filter(Boolean))];
};

const parseMatrix = (content: string): MatrixFile => {
  const parsed = JSON.parse(content) as Partial<MatrixFile>;

  if (!Array.isArray(parsed.users)) {
    throw new Error('Matrix file must contain a "users" array');
  }

  const users = parsed.users.map((entry, index): MatrixRow => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`users[${index}] must be an object`);
    }

    const email = normalizeEmail(toString((entry as { email?: unknown }).email));
    if (!email) {
      throw new Error(`users[${index}].email is required`);
    }

    const projectCodes = parseProjectCodes((entry as { projectCodes?: unknown }).projectCodes, index);
    const isActiveRaw = (entry as { isActive?: unknown }).isActive;
    const isActive = typeof isActiveRaw === 'boolean' ? isActiveRaw : true;

    return { email, projectCodes, isActive };
  });

  return { users };
};

const formatChanges = (label: string, count: number) => `${label}: ${count}`;

const main = async () => {
  assertWriteAllowed('sync-project-memberships');

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();

  try {
    const matrixRaw = await fs.readFile(matrixPath, 'utf8');
    const matrix = parseMatrix(matrixRaw);

    await client.query('BEGIN');

    const projectsResult = await client.query<{ id: string; code: string }>(
      'SELECT id, code FROM projects'
    );
    const projectsByCode = new Map(projectsResult.rows.map((row) => [row.code, row.id]));

    const usersResult = await client.query<{ id: string; email: string; role: string; is_active: boolean }>(
      'SELECT id, email, role, is_active FROM users'
    );
    const usersByEmail = new Map(usersResult.rows.map((row) => [row.email.toLowerCase(), row]));

    const report = {
      unknownUsers: [] as string[],
      unknownProjects: [] as string[],
      updatedUsers: 0,
      membershipsTouched: 0,
      membershipsDeactivated: 0
    };

    for (const row of matrix.users) {
      const userRow = usersByEmail.get(row.email);

      if (!userRow) {
        report.unknownUsers.push(row.email);
        continue;
      }

      if (!userRow.is_active) {
        console.log(`⚠️ ${row.email} está marcado inactivo en users; se omite`);
        continue;
      }

      if (userRow.role !== 'topografo') {
        console.log(`ℹ️ ${row.email} rol ${userRow.role} no requiere membresías por obra`);
        continue;
      }

      const desiredProjectIds: string[] = [];
      const unknownProjectCodes: string[] = [];
      for (const code of row.projectCodes) {
        const projectId = projectsByCode.get(code);
        if (!projectId) {
          unknownProjectCodes.push(code);
          continue;
        }
        desiredProjectIds.push(projectId);
      }

      if (unknownProjectCodes.length > 0) {
        report.unknownProjects.push(`${row.email}: ${unknownProjectCodes.join(', ')}`);
        continue;
      }

      const deactivated = await client.query<{ count: string }>(
        `
          UPDATE project_memberships
          SET is_active = FALSE, updated_at = NOW()
          WHERE user_id = $1
            AND is_active = TRUE
            AND project_id <> ALL($2::uuid[])
        `,
          [userRow.id, desiredProjectIds]
      );
      report.membershipsDeactivated += Number(deactivated.rowCount ?? 0);

      for (const projectId of desiredProjectIds) {
        const alreadyExists = await client.query(
          'SELECT 1 FROM project_memberships WHERE user_id = $1 AND project_id = $2',
          [userRow.id, projectId]
        );

        await client.query(
          `
            INSERT INTO project_memberships (user_id, project_id, assigned_by, is_active)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, project_id)
            DO UPDATE
              SET is_active = EXCLUDED.is_active,
                  updated_at = NOW()
          `,
          [userRow.id, projectId, null, row.isActive]
        );

        report.membershipsTouched += alreadyExists.rowCount === 0 ? 1 : 0;
      }

      report.updatedUsers += 1;
    }

    if (report.unknownUsers.length > 0) {
      console.log('⚠️ Correos no encontrados en users:');
      for (const user of report.unknownUsers) {
        console.log(`  - ${user}`);
      }
    }

    if (report.unknownProjects.length > 0) {
      console.log('⚠️ Códigos de obra no encontrados:');
      for (const item of report.unknownProjects) {
        console.log(`  - ${item}`);
      }
    }

    if (report.unknownUsers.length > 0 || report.unknownProjects.length > 0) {
      throw new Error('La matriz contiene datos no válidos.');
    }

    await client.query('COMMIT');

    console.log(`Sincronizadas ${report.updatedUsers} cuentas de usuario desde ${matrixPath}.`);
    console.log(formatChanges('Filas actualizadas', report.updatedUsers));
    console.log(formatChanges('Nuevas membresías creadas', report.membershipsTouched));
    console.log(formatChanges('Membresías desactivadas', report.membershipsDeactivated));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('sync-project-memberships: failed');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
