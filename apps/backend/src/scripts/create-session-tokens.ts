import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

import { loadedEnvPath } from '../lib/load-env.js';
import { assertWriteAllowed } from './safety.js';

type TargetUser = {
  email: string;
  fullName: string;
  password: string;
  role: 'admin' | 'topografo';
};

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} must be defined in ${loadedEnvPath}`);
  }
}

const adminClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const anonClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL
});

const buildPassword = (role: TargetUser['role']) => {
  return `TopoField-${role}-${Date.now()}!`;
};

const targetUsers: TargetUser[] = [
  {
    email: 'topofield-admin@topofield.local',
    fullName: 'Admin TopoField',
    password: buildPassword('admin'),
    role: 'admin'
  },
  {
    email: 'topofield-topografo@topofield.local',
    fullName: 'Topógrafo TopoField',
    password: buildPassword('topografo'),
    role: 'topografo'
  }
];

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

const ensureAuthUser = async ({ email, fullName, password, role }: TargetUser) => {
  const existingUser = await findAuthUserByEmail(email);

  if (existingUser) {
    const result = await adminClient.auth.admin.updateUserById(existingUser.id, {
      app_metadata: { role },
      email_confirm: true,
      password,
      user_metadata: {
        full_name: fullName,
        role
      }
    });

    if (result.error || !result.data.user) {
      throw result.error ?? new Error(`Unable to update auth user ${email}`);
    }

    return result.data.user;
  }

  const result = await adminClient.auth.admin.createUser({
    app_metadata: { role },
    email,
    email_confirm: true,
    password,
    user_metadata: {
      full_name: fullName,
      role
    }
  });

  if (result.error || !result.data.user) {
    throw result.error ?? new Error(`Unable to create auth user ${email}`);
  }

  return result.data.user;
};

const upsertLocalUser = async (userId: string, user: TargetUser) => {
  await pgClient.query(
    `
      INSERT INTO users (id, email, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (id) DO UPDATE
      SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = TRUE,
        updated_at = NOW()
    `,
    [userId, user.email, user.fullName, user.role]
  );
};

const assignTopografoToAllProjects = async (userId: string) => {
  await pgClient.query(
    `
      INSERT INTO project_memberships (user_id, project_id, assigned_by, is_active)
      SELECT $1, p.id, NULL, TRUE
      FROM projects p
      WHERE NOT EXISTS (
        SELECT 1
        FROM project_memberships pm
        WHERE pm.user_id = $1
          AND pm.project_id = p.id
      )
    `,
    [userId]
  );
};

const signIn = async ({ email, password }: TargetUser) => {
  const result = await anonClient.auth.signInWithPassword({ email, password });

  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`Unable to sign in ${email}`);
  }

  return result.data.session;
};

const main = async () => {
  assertWriteAllowed('create-session-tokens');

  await pgClient.connect();

  try {
    const outputs = [];

    for (const targetUser of targetUsers) {
      const authUser = await ensureAuthUser(targetUser);
      await upsertLocalUser(authUser.id, targetUser);

      if (targetUser.role === 'topografo') {
        await assignTopografoToAllProjects(authUser.id);
      }

      const session = await signIn(targetUser);

      outputs.push({
        accessToken: session.access_token,
        email: targetUser.email,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        password: targetUser.password,
        role: targetUser.role,
        userId: authUser.id
      });
    }

    const outputPath = path.resolve(process.cwd(), '../../topofield-session-tokens.local');
    const content = [
      '# TopoField session tokens',
      '# Archivo local ignorado por git (*.local). No subir a GitHub.',
      `# Generado: ${new Date().toISOString()}`,
      '',
      ...outputs.flatMap((entry) => [
        `## ${entry.role}`,
        `email=${entry.email}`,
        `password=${entry.password}`,
        `userId=${entry.userId}`,
        `expiresAt=${entry.expiresAt ?? ''}`,
        `accessToken=${entry.accessToken}`,
        ''
      ])
    ].join('\n');

    await fs.writeFile(outputPath, content, { encoding: 'utf8', mode: 0o600 });
    console.log(`Tokens written to ${outputPath}`);
  } finally {
    await pgClient.end();
  }
};

main().catch((error) => {
  console.error('create-session-tokens: failed');
  console.error(error);
  process.exit(1);
});
