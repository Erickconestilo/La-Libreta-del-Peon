import test from 'node:test';
import assert from 'node:assert/strict';

import { AppError } from './app-error.js';
import {
  assertProjectAccess,
  assertProjectWriteAccess,
  assertTopografoHasScopedResource,
  canActorAccessProject,
  canActorWriteProject,
  getActorProjectScope
} from './access-control.js';

const projectA = '11111111-1111-1111-1111-111111111111';
const projectB = '22222222-2222-2222-2222-222222222222';

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

const surveyorA = {
  ...surveyorUser,
  id: 'surveyor-a',
  projectIds: [projectA]
};

const supervisorUser = {
  authProvider: 'supabase' as const,
  email: 'supervisor@topofield.local',
  id: 'supervisor-user',
  projectIds: [projectA],
  projectAccess: { [projectA]: 'read' as const },
  role: 'supervisor' as const
};

const surveyorB = {
  ...surveyorUser,
  id: 'surveyor-b',
  projectIds: [projectB]
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

test('read-only project membership can consult but cannot write', () => {
  const supervisorMembership = {
    ...surveyorA,
    projectAccess: { [projectA]: 'read' as const }
  };

  assert.doesNotThrow(() => assertProjectAccess(supervisorMembership, projectA));
  assert.throws(
    () => assertProjectWriteAccess(supervisorMembership, projectA),
    (error: unknown) => error instanceof AppError && error.code === 'READ_ONLY_PROJECT_MEMBERSHIP'
  );
});

test('supervisor is scoped and always read-only even with a write membership', () => {
  assert.deepEqual(getActorProjectScope(supervisorUser), [projectA]);
  assert.doesNotThrow(() => assertProjectAccess(supervisorUser, projectA));
  assert.throws(
    () => assertProjectWriteAccess({ ...supervisorUser, projectAccess: { [projectA]: 'write' as const } }, projectA),
    (error: unknown) => error instanceof AppError && error.code === 'READ_ONLY_ACCESS'
  );
  assert.equal(canActorAccessProject(supervisorUser, projectA), true);
  assert.equal(canActorAccessProject(supervisorUser, projectB), false);
  assert.equal(canActorWriteProject(supervisorUser, projectA), false);
});

test('read-only project membership cannot export operational data', () => {
  const supervisorMembership = {
    ...surveyorA,
    projectAccess: { [projectA]: 'read' as const }
  };

  assert.throws(
    () => assertProjectWriteAccess(supervisorMembership, projectA),
    (error: unknown) => error instanceof AppError && error.code === 'READ_ONLY_PROJECT_MEMBERSHIP'
  );
});

test('canActorAccessProject mirrors access semantics for each role', () => {
  assert.equal(canActorAccessProject(adminUser, null), true);
  assert.equal(canActorAccessProject(visitorUser, 'whatever'), true);
  assert.equal(canActorAccessProject(surveyorUser, null), false);
  assert.equal(canActorAccessProject(surveyorUser, 'project-a'), true);
  assert.equal(canActorAccessProject(surveyorUser, 'project-z'), false);
});

test('separate project memberships deny every project-bound endpoint family across works', () => {
  const endpointFamilies = [
    'projects',
    'stations',
    'station photos',
    'station messages',
    'station prisms',
    'prism coverage',
    'prism photos',
    'incidents',
    'change logs',
    'signed uploads',
    'monitoring rounds',
    'round points',
    'instrument readings',
    'reading attachments',
    'control points',
    'thresholds',
    'reading history'
  ];

  for (const endpointFamily of endpointFamilies) {
    assert.equal(canActorAccessProject(surveyorA, projectA), true, `${endpointFamily}: A can access A`);
    assert.equal(canActorAccessProject(surveyorB, projectB), true, `${endpointFamily}: B can access B`);
    assert.equal(canActorAccessProject(surveyorA, projectB), false, `${endpointFamily}: A cannot access B`);
    assert.equal(canActorAccessProject(surveyorB, projectA), false, `${endpointFamily}: B cannot access A`);

    assert.throws(
      () => assertProjectAccess(surveyorA, projectB),
      (error: unknown) => error instanceof AppError && error.code === 'FORBIDDEN_PROJECT_ACCESS',
      `${endpointFamily}: A write to B is forbidden`
    );
    assert.throws(
      () => assertProjectAccess(surveyorB, projectA),
      (error: unknown) => error instanceof AppError && error.code === 'FORBIDDEN_PROJECT_ACCESS',
      `${endpointFamily}: B write to A is forbidden`
    );
  }
});

test('topografo cannot create a projectless incident while an admin can', () => {
  assert.throws(
    () => assertTopografoHasScopedResource(surveyorA, false),
    (error: unknown) => error instanceof AppError && error.code === 'PROJECT_REQUIRED'
  );
  assert.doesNotThrow(() => assertTopografoHasScopedResource(surveyorA, true));
  assert.doesNotThrow(() => assertTopografoHasScopedResource(adminUser, false));
});
