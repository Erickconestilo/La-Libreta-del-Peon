import test from 'node:test';
import assert from 'node:assert/strict';

import type { Request, Response } from 'express';

import { requireRole } from './auth.js';
import type { AuthenticatedUser } from '../types/express.js';

/**
 * requireRole es el único punto que decide si un rol concreto puede tocar
 * una ruta. No tenía ninguna prueba propia: las pruebas de access-control.ts
 * cubren el scope por obra (qué proyectos ve cada rol), no la puerta de
 * entrada por rol y ruta. Existe porque el 02-08-2026 se quitó 'visitante'
 * de 5 rutas de auscultación (rondas, puntos de control, lecturas,
 * umbrales) sin ninguna prueba que impida que alguien lo reintroduzca por
 * error al copiar el patrón de una ruta pública en una nueva.
 */

const adminUser: AuthenticatedUser = {
  authProvider: 'supabase',
  email: 'admin@topofield.local',
  id: 'admin-user',
  projectIds: null,
  role: 'admin'
};

const surveyorUser: AuthenticatedUser = {
  authProvider: 'supabase',
  email: 'topografo@topofield.local',
  id: 'surveyor-user',
  projectIds: ['project-a'],
  role: 'topografo'
};

const guestUser: AuthenticatedUser = {
  authProvider: 'guest',
  email: null,
  id: 'guest',
  projectIds: null,
  role: 'visitante'
};

const buildResponse = () => {
  const state: { statusCode: number | null; body: unknown } = { statusCode: null, body: null };
  const response = {
    status(code: number) {
      state.statusCode = code;
      return response;
    },
    json(body: unknown) {
      state.body = body;
      return response;
    }
  } as unknown as Response;
  return { response, state };
};

const buildRequest = (user: AuthenticatedUser | undefined): Request => {
  return { user } as unknown as Request;
};

const runMiddleware = async (roles: Array<'admin' | 'topografo' | 'visitante'>, user: AuthenticatedUser | undefined) => {
  const request = buildRequest(user);
  const { response, state } = buildResponse();
  let nextCalledWith: unknown = 'not-called';

  await requireRole(roles)(request, response, ((error?: unknown) => {
    nextCalledWith = error ?? null;
  }) as never);

  return { state, nextCalledWith };
};

test('requireRole deja pasar a un rol incluido en la lista', async () => {
  const { state, nextCalledWith } = await runMiddleware(['admin', 'topografo'], adminUser);
  assert.equal(nextCalledWith, null);
  assert.equal(state.statusCode, null, 'no debe escribir una respuesta de error');
});

test('requireRole rechaza con 403 a un rol que no está en la lista', async () => {
  const { state, nextCalledWith } = await runMiddleware(['admin', 'topografo'], guestUser);
  assert.equal(nextCalledWith, 'not-called', 'no debe llamar a next() en un rechazo');
  assert.equal(state.statusCode, 403);
  assert.deepEqual(state.body, {
    data: null,
    error: { code: 'FORBIDDEN', message: 'Insufficient permissions' }
  });
});

test('requireRole rechaza con 401 cuando no hay usuario autenticado', async () => {
  const { state, nextCalledWith } = await runMiddleware(['admin', 'topografo'], undefined);
  assert.equal(nextCalledWith, 'not-called');
  assert.equal(state.statusCode, 401);
});

test('las 5 rutas de auscultación restringidas el 02-08-2026 (D1) rechazan a visitante', async () => {
  // Regresión directa de D1: si alguien reintroduce 'visitante' en alguna de
  // estas listas, esta prueba falla. La lista de roles vive en las rutas
  // (monitoring.routes.ts, projects.routes.ts); aquí se fija el contrato
  // esperado para que un cambio silencioso no pase inadvertido.
  const auscultacionRoles: Array<'admin' | 'topografo'> = ['admin', 'topografo'];

  for (const user of [guestUser]) {
    const { state } = await runMiddleware(auscultacionRoles, user);
    assert.equal(state.statusCode, 403, `visitante debe recibir 403 con los roles de auscultación (${user.role})`);
  }

  for (const user of [adminUser, surveyorUser]) {
    const { nextCalledWith } = await runMiddleware(auscultacionRoles, user);
    assert.equal(nextCalledWith, null, `${user.role} debe poder pasar con los roles de auscultación`);
  }
});
