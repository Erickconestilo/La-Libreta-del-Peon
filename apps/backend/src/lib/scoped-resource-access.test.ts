import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from './app-error.js';
import { requireScopedResourceBeforeExternalCheck } from './scoped-resource-access.js';

test('does not execute an external check when the scoped resource is inaccessible', async () => {
  const calls: string[] = [];

  await assert.rejects(
    requireScopedResourceBeforeExternalCheck({
      code: 'PROJECT_NOT_FOUND',
      loadResource: async () => {
        calls.push('load');
        return null;
      },
      message: 'Project not found',
      verifyAfterAccess: async () => {
        calls.push('verify');
      }
    }),
    (error: unknown) => error instanceof AppError && error.code === 'PROJECT_NOT_FOUND'
  );

  assert.deepEqual(calls, ['load']);
});

test('executes the external check after scoped resource access succeeds', async () => {
  const calls: string[] = [];

  const resource = await requireScopedResourceBeforeExternalCheck({
    code: 'PROJECT_NOT_FOUND',
    loadResource: async () => {
      calls.push('load');
      return { id: 'project-a' };
    },
    message: 'Project not found',
    verifyAfterAccess: async () => {
      calls.push('verify');
    }
  });

  assert.deepEqual(resource, { id: 'project-a' });
  assert.deepEqual(calls, ['load', 'verify']);
});
