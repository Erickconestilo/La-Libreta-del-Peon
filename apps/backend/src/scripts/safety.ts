const PRODUCTION_ENV_VALUES = new Set(['prod', 'production']);
const PRODUCTION_DATABASE_HOST_PARTS = [
  'supabase.co',
  'pooler.supabase.com',
  'render.com',
  'render-postgres'
];

const getDatabaseHost = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be defined before running database write scripts');
  }

  try {
    return new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }
};

const isLikelyProductionDatabase = () => {
  const environmentName = (process.env.TOPOFIELD_ENV ?? process.env.NODE_ENV ?? '').toLowerCase();

  if (PRODUCTION_ENV_VALUES.has(environmentName)) {
    return true;
  }

  const databaseHost = getDatabaseHost();

  return PRODUCTION_DATABASE_HOST_PARTS.some((hostPart) => databaseHost.includes(hostPart));
};

export const assertWriteAllowed = (scriptName: string) => {
  if (!isLikelyProductionDatabase()) {
    return;
  }

  const allowedScript = process.env.TOPOFIELD_ALLOW_PRODUCTION_WRITE;

  if (allowedScript === scriptName || allowedScript === '*') {
    return;
  }

  throw new Error(
    [
      `Refusing to run ${scriptName} against a likely production database.`,
      `Set TOPOFIELD_ALLOW_PRODUCTION_WRITE=${scriptName} only after confirming the target database.`
    ].join(' ')
  );
};
