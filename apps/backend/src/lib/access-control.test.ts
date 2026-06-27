import test from 'node:test';
import assert from 'node:assert/strict';

import { AppError } from './app-error.js';
import { assertProjectAccess, canActorAccessProject, getActorProjectScope } from './access-control.js';

const adminUser = {
  authProvider: 'supabase' as const,
  email: 'admin@topofield.local',
  id: 'admin-user',
  projectIds: null,
  role: 'admin' as const
};

const visitorUser = {
  authProvider: 'guest' as const,
  email: null,
  id: 'guest-user',
  projectIds: null,
  role: 'visitante' as const
};

const surveyorUser = {
  authProvider: 'supabase' as const,
  email: 'topografo@topofield.local',
  id: 'surveyor-user',
  projectIds: ['project-a', 'project-b'],
  role: 'topografo' as const
};

test('getActorProjectScope returns unrestricted scope for admin and visitante', () => {
  assert.equal(getActorProjectScope(adminUser), null);
  assert.equal(getActorProjectScope(visitorUser), null);
});

test('getActorProjectScope returns topografo memberships or empty list', () => {
  assert.deepEqual(getActorProjectScope(surveyorUser), ['project-a', 'project-b']);
  assert.deepEqual(
    getActorProjectScope({
      ...surveyorUser,
      projectIds: null
    }),
    []
  );
});

test('assertProjectAccess allows admin and visitante regardless of project', () => {
  assert.doesNotThrow(() => assertProjectAccess(adminUser, null));
  assert.doesNotThrow(() => assertProjectAccess(visitorUser, 'project-a'));
});

test('assertProjectAccess rejects topografo without project id', () => {
  assert.throws(() => assertProjectAccess(surveyorUser, null), (error: unknown) => {
    return error instanceof AppError && error.code === 'PROJECT_REQUIRED';
  });
});

test('assertProjectAccess rejects topografo outside assigned scope', () => {
  assert.throws(() => assertProjectAccess(surveyorUser, 'project-z'), (error: unknown) => {
    return error instanceof AppError && error.code === 'FORBIDDEN_PROJECT_ACCESS';
  });
});

test('assertProjectAccess allows topografo inside assigned scope', () => {
  assert.doesNotThrow(() => assertProjectAccess(surveyorUser, 'project-a'));
});

test('canActorAccessProject mirrors access semantics for each role', () => {
  assert.equal(canActorAccessProject(adminUser, null), true);
  assert.equal(canActorAccessProject(visitorUser, 'whatever'), true);
  assert.equal(canActorAccessProject(surveyorUser, null), false);
  assert.equal(canActorAccessProject(surveyorUser, 'project-a'), true);
  assert.equal(canActorAccessProject(surveyorUser, 'project-z'), false);
});
