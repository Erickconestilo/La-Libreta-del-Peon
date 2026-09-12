import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

import { loadedEnvPath } from '../lib/load-env.js';
import { assertWriteAllowed } from './safety.js';

const TARGET_EMAIL = 'supervisor-piloto@topofield.local';
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} must be defined in ${loadedEnvPath}`);
  }
}

const targetEmail = process.argv[2]?.trim().toLowerCase();

if (targetEmail !== TARGET_EMAIL) {
  throw new Error(`Uso exacto: migrate-qa-supervisor-account.ts ${TARGET_EMAIL}`);
}

const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const pgClient = new Client({ connectionString: process.env.DATABASE_URL });

const findAuthUserByEmail = async () => {
  let page = 1;
  const perPage = 100;

  while (page <= 20) {
    const result = await adminClient.auth.admin.listUsers({ page, perPage });

    if (result.error) {
      throw result.error;
    }

    const user = result.data.users.find((candidate) => candidate.email?.toLowerCase() === TARGET_EMAIL);

    if (user) {
      return user;
    }

    if (result.data.users.length < perPage) {
      return null;
    }

    page += 1;
  }

  return null;
};

const main = async () => {
  assertWriteAllowed('migrate-qa-supervisor-account');
  await pgClient.connect();

  try {
    const authUser = await findAuthUserByEmail();

    if (!authUser) {
      throw new Error(`No existe ningún usuario Auth con email ${TARGET_EMAIL}. No se crea uno nuevo.`);
    }

    const publicUser = await pgClient.query<{ id: string; role: string }>(
      'SELECT id, role FROM public.users WHERE lower(email) = lower($1)',
      [TARGET_EMAIL]
    );

    if (publicUser.rowCount !== 1 || publicUser.rows[0].id !== authUser.id) {
      throw new Error('La cuenta no tiene exactamente una fila public.users coincidente con Auth. No se modifica nada.');
    }

    const memberships = await pgClient.query<{
      access_level: string | null;
      code: string;
      is_active: boolean;
      project_id: string;
    }>(
      `
        SELECT pm.project_id, p.code, pm.access_level, pm.is_active
        FROM public.project_memberships pm
        INNER JOIN public.projects p ON p.id = pm.project_id
        WHERE pm.user_id = $1 AND pm.is_active = TRUE
      `,
      [authUser.id]
    );

    if (
      memberships.rowCount !== 1 ||
      memberships.rows[0].code !== 'campus-nord' ||
      memberships.rows[0].access_level !== 'read'
    ) {
      throw new Error('La cuenta no conserva exactamente una membresía activa read en campus-nord. No se modifica nada.');
    }

    await pgClient.query('BEGIN');
    let authMetadataUpdated = false;

    try {
      const authUpdate = await adminClient.auth.admin.updateUserById(authUser.id, {
        app_metadata: { ...(authUser.app_metadata ?? {}), role: 'supervisor' },
        user_metadata: { ...(authUser.user_metadata ?? {}), role: 'supervisor' }
      });

      if (authUpdate.error || !authUpdate.data.user) {
        throw authUpdate.error ?? new Error('No se pudo actualizar la metadata Auth.');
      }

      authMetadataUpdated = true;

      const update = await pgClient.query<{ email: string; id: string; role: string }>(
        `
          UPDATE public.users
          SET role = 'supervisor', updated_at = NOW()
          WHERE id = $1 AND lower(email) = lower($2)
          RETURNING id, email, role
        `,
        [authUser.id, TARGET_EMAIL]
      );

      if (update.rowCount !== 1 || update.rows[0].role !== 'supervisor') {
        throw new Error('No se pudo actualizar exactamente la fila public.users.');
      }

      await pgClient.query('COMMIT');
      console.log(
        JSON.stringify({
          accessLevel: 'read',
          authMetadataRole: 'supervisor',
          email: TARGET_EMAIL,
          membershipCount: 1,
          projectCode: 'campus-nord',
          publicRole: 'supervisor',
          userId: authUser.id
        })
      );
    } catch (error) {
      await pgClient.query('ROLLBACK');

      if (authMetadataUpdated) {
        await adminClient.auth.admin.updateUserById(authUser.id, {
          app_metadata: authUser.app_metadata ?? {},
          user_metadata: authUser.user_metadata ?? {}
        });
      }

      throw error;
    }
  } finally {
    await pgClient.end();
  }
};

main().catch((error) => {
  console.error('migrate-qa-supervisor-account: failed');
  console.error(error);
  process.exit(1);
});
