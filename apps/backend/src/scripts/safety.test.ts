import assert from 'node:assert/strict';
import test from 'node:test';

import { assertWriteAllowed } from './safety.js';

const ENV_KEYS = ['DATABASE_URL', 'NODE_ENV', 'TOPOFIELD_ENV', 'TOPOFIELD_ALLOW_PRODUCTION_WRITE'] as const;

test('write guard blocks production-like databases unless explicitly allowed', () => {
  const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  try {
    process.env.DATABASE_URL = 'postgres://user:password@db.supabase.co:5432/postgres';
    delete process.env.NODE_ENV;
    delete process.env.TOPOFIELD_ENV;
    delete process.env.TOPOFIELD_ALLOW_PRODUCTION_WRITE;

    assert.throws(
      () => assertWriteAllowed('example-write-script'),
      /Refusing to run example-write-script against a likely production database/
    );

    process.env.TOPOFIELD_ALLOW_PRODUCTION_WRITE = 'example-write-script';
    assert.doesNotThrow(() => assertWriteAllowed('example-write-script'));
  } finally {
    for (const key of ENV_KEYS) {
      const value = original[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
