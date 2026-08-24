import { createClient } from '@supabase/supabase-js';

import { loadedEnvPath } from '../lib/load-env.js';
import { assertWriteAllowed } from './safety.js';
import { generateTemporaryPassword } from './password-generator.js';

/**
 * Resetea la contraseña de una cuenta técnica de QA existente vía la API de
 * administración de Supabase Auth, sin tocar `public.users` ni
 * `project_memberships`.
 *
 * Existe porque `create-session-tokens.ts` hace lo mismo pero además
 * reasigna al topógrafo a TODAS las obras (`assignTopografoToAllProjects`),
 * deshaciendo la restricción deliberada a campus-nord/maragall documentada
 * en PROJECT_MEMBERSHIPS_MATRIX.md para poder validar aislamiento real
 * entre obras. Este script solo cambia lo que se pidió: la contraseña.
 *
 * Uso:
 *   TOPOFIELD_ALLOW_PRODUCTION_WRITE=reset-test-user-password \
 *     npx tsx src/scripts/reset-test-user-password.ts topofield-topografo@topofield.local
 */

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'DATABASE_URL'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} must be defined in ${loadedEnvPath}`);
  }
}

const targetEmail = process.argv[2];

if (!targetEmail) {
  throw new Error('Uso: reset-test-user-password.ts <email>');
}

const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const anonClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const findAuthUserByEmail = async (email: string) => {
  let page = 1;
  const perPage = 100;

  while (page <= 20) {
    const result = await adminClient.auth.admin.listUsers({ page, perPage });

    if (result.error) {
      throw result.error;
    }

    const user = result.data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());

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
  assertWriteAllowed('reset-test-user-password');

  const existingUser = await findAuthUserByEmail(targetEmail);

  if (!existingUser) {
    throw new Error(`No existe ningún usuario Auth con email ${targetEmail}. No se crea uno nuevo: este script solo resetea.`);
  }

  const newPassword = generateTemporaryPassword();

  const updateResult = await adminClient.auth.admin.updateUserById(existingUser.id, {
    password: newPassword
  });

  if (updateResult.error || !updateResult.data.user) {
    throw updateResult.error ?? new Error(`No se pudo actualizar la contraseña de ${targetEmail}`);
  }

  // Verificación real, no supuesta: intentar iniciar sesión con la contraseña nueva.
  const signInResult = await anonClient.auth.signInWithPassword({
    email: targetEmail,
    password: newPassword
  });

  if (signInResult.error || !signInResult.data.session) {
    throw new Error(
      `La contraseña se actualizó pero el login de verificación falló: ${signInResult.error?.message ?? 'sin sesión'}`
    );
  }

  console.log('=== RESULTADO ===');
  console.log(`email=${targetEmail}`);
  console.log(`userId=${existingUser.id}`);
  console.log(`password=${newPassword}`);
  console.log('login de verificación: OK (sesión real obtenida)');
  console.log('project_memberships: NO tocado por este script');
};

main().catch((error) => {
  console.error('reset-test-user-password: failed');
  console.error(error);
  process.exit(1);
});
