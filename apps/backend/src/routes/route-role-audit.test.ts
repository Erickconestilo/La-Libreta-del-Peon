import test from 'node:test';
import assert from 'node:assert/strict';

import type { Router } from 'express';

import { controlPointsRouter, roundPointsRouter, roundsRouter } from './monitoring.routes.js';
import { journeyRouter } from './journey.routes.js';
import { projectsRouter } from './projects.routes.js';
import { stationsRouter } from './stations.routes.js';
import { changeLogsRouter } from './change-logs.routes.js';
import { guideRouter } from './guide.routes.js';
import { incidentsRouter } from './incidents.routes.js';
import { prismsRouter } from './prisms.routes.js';
import { uploadsRouter } from './uploads.routes.js';
import type { RequireRoleMiddleware } from '../middleware/auth.js';

/**
 * Audita directamente los routers reales, no una copia a mano de la lista
 * de roles: si alguien reintroduce 'visitante' en una ruta de auscultación
 * (por ejemplo copiando el patrón de una ruta pública para una nueva),
 * esta prueba falla sin depender de que alguien recuerde actualizar un test
 * en paralelo. Existe porque el 02-08-2026 se quitó 'visitante' de las rutas
 * de auscultación (D1, ver ROADMAP.md) y hasta entonces no había ninguna prueba que
 * protegiera esa decisión de una regresión silenciosa.
 */

type RouteExpectation = {
  method: string;
  path: string;
  mustExcludeVisitante: boolean;
};

const auscultacionRoutesFromRoundsRouter: RouteExpectation[] = [
  { method: 'get', path: '/:roundId/export', mustExcludeVisitante: true },
  { method: 'get', path: '/:roundId', mustExcludeVisitante: true },
  { method: 'patch', path: '/:roundId', mustExcludeVisitante: true },
  { method: 'get', path: '/:roundId/completion-reports', mustExcludeVisitante: true },
  { method: 'post', path: '/:roundId/completion-reports', mustExcludeVisitante: true }
];

const auscultacionRoutesFromRoundPointsRouter: RouteExpectation[] = [
  { method: 'post', path: '/:roundPointId/readings', mustExcludeVisitante: true },
  { method: 'post', path: '/:roundPointId/readings/:readingId/attachments', mustExcludeVisitante: true }
];

const auscultacionRoutesFromControlPointsRouter: RouteExpectation[] = [
  { method: 'get', path: '/:controlPointId/readings', mustExcludeVisitante: true },
  { method: 'get', path: '/:controlPointId/thresholds', mustExcludeVisitante: true }
];

const auscultacionRoutesFromProjectsRouter: RouteExpectation[] = [
  { method: 'get', path: '/:projectId/rounds', mustExcludeVisitante: true },
  { method: 'get', path: '/:projectId/control-points', mustExcludeVisitante: true }
];

const findAllowedRoles = (router: Router, method: string, path: string): Array<'admin' | 'topografo' | 'supervisor' | 'visitante'> | null => {
  for (const layer of router.stack as unknown as Array<{ route?: { path: string; stack: Array<{ method: string; handle: unknown }> } }>) {
    if (!layer.route || layer.route.path !== path) continue;

    for (const routeLayer of layer.route.stack) {
      if (routeLayer.method !== method) continue;

      const handle = routeLayer.handle as Partial<RequireRoleMiddleware>;
      if (Array.isArray(handle.allowedRoles)) {
        return handle.allowedRoles;
      }
    }
  }

  return null;
};

const auditRouter = (routerName: string, router: Router, expectations: RouteExpectation[]) => {
  for (const expectation of expectations) {
      test(`${routerName} ${expectation.method.toUpperCase()} ${expectation.path}: visitante excluido`, () => {
      const allowedRoles = findAllowedRoles(router, expectation.method, expectation.path);

      assert.ok(
        allowedRoles,
        `no se encontró un requireRole(...) para ${expectation.method.toUpperCase()} ${expectation.path} en ${routerName}; ` +
          'si la ruta cambió de forma, actualiza esta auditoría a propósito, no por accidente'
      );

      if (expectation.mustExcludeVisitante) {
        assert.ok(
          !allowedRoles!.includes('visitante'),
          `${routerName} ${expectation.method.toUpperCase()} ${expectation.path} admite 'visitante' — ` +
            'esto revierte la decisión D1 (ROADMAP.md, 02-08-2026) de que el token público no lea auscultación'
        );
      }
    });
  }
};

auditRouter('roundsRouter', roundsRouter, auscultacionRoutesFromRoundsRouter);
auditRouter('roundPointsRouter', roundPointsRouter, auscultacionRoutesFromRoundPointsRouter);
auditRouter('controlPointsRouter', controlPointsRouter, auscultacionRoutesFromControlPointsRouter);
auditRouter('projectsRouter', projectsRouter, auscultacionRoutesFromProjectsRouter);

test('project operators route is admin-only', () => {
  const allowedRoles = findAllowedRoles(projectsRouter, 'get', '/:projectId/operators');
  assert.deepEqual(allowedRoles, ['admin']);
});

test('read-only monitoring routes allow supervisor while write routes do not', () => {
  assert.deepEqual(findAllowedRoles(roundsRouter, 'get', '/:roundId'), ['admin', 'topografo', 'supervisor']);
  assert.deepEqual(findAllowedRoles(roundsRouter, 'post', '/:roundId/completion-reports'), ['admin', 'topografo']);
  assert.deepEqual(findAllowedRoles(roundsRouter, 'get', '/:roundId/export'), ['admin', 'topografo']);
  assert.deepEqual(findAllowedRoles(controlPointsRouter, 'get', '/:controlPointId/readings'), ['admin', 'topografo', 'supervisor']);
  assert.deepEqual(findAllowedRoles(roundPointsRouter, 'post', '/:roundPointId/readings'), ['admin', 'topografo']);
  assert.deepEqual(
    findAllowedRoles(roundPointsRouter, 'post', '/:roundPointId/readings/:readingId/attachments'),
    ['admin', 'topografo']
  );
});

test('personal journey route excludes visitor', () => {
  const allowedRoles = findAllowedRoles(journeyRouter, 'get', '/');
  assert.deepEqual(allowedRoles, ['admin', 'topografo']);
});

test('mounting visit routes separate consultation from evidence writes', () => {
  assert.deepEqual(findAllowedRoles(stationsRouter, 'get', '/:stationId/mounting-visits'), [
    'admin',
    'topografo',
    'supervisor'
  ]);
  assert.deepEqual(findAllowedRoles(stationsRouter, 'post', '/:stationId/mounting-visits'), [
    'admin',
    'topografo'
  ]);
  assert.deepEqual(findAllowedRoles(stationsRouter, 'patch', '/:stationId/mounting-visits/:visitId'), [
    'admin',
    'topografo'
  ]);
  assert.deepEqual(findAllowedRoles(stationsRouter, 'post', '/:stationId/mounting-visits/:visitId/evidence'), [
    'admin',
    'topografo'
  ]);
});

type RouteLayer = {
  route?: {
    path: string;
    stack: Array<{ handle: unknown; method: string }>;
  };
};

const businessRouters: Array<[string, Router]> = [
  ['changeLogsRouter', changeLogsRouter],
  ['guideRouter', guideRouter],
  ['incidentsRouter', incidentsRouter],
  ['journeyRouter', journeyRouter],
  ['projectsRouter', projectsRouter],
  ['prismsRouter', prismsRouter],
  ['controlPointsRouter', controlPointsRouter],
  ['roundPointsRouter', roundPointsRouter],
  ['roundsRouter', roundsRouter],
  ['stationsRouter', stationsRouter],
  ['uploadsRouter', uploadsRouter]
];

const routeLayers = (router: Router) => (router.stack as unknown as RouteLayer[])
  .filter((layer): layer is Required<RouteLayer> => Boolean(layer.route));

test('every business endpoint is protected by auth and an explicit role gate', () => {
  for (const [routerName, router] of businessRouters) {
    for (const layer of routeLayers(router)) {
      const handlers = layer.route.stack.map((routeLayer) => routeLayer.handle as { allowedRoles?: unknown; name?: string });

      assert.ok(
        handlers.some((handler) => handler.name === 'requireAuth'),
        `${routerName} ${layer.route.path}: falta requireAuth`
      );
      assert.ok(
        handlers.some((handler) => Array.isArray(handler.allowedRoles)),
        `${routerName} ${layer.route.path}: falta requireRole explícito`
      );
    }
  }
});

test('public visitor access is limited to GET routes and supervisors are never granted writes', () => {
  for (const [routerName, router] of businessRouters) {
    for (const layer of routeLayers(router)) {
      const method = layer.route.stack.find((routeLayer) => routeLayer.method)?.method;
      const roleMiddleware = layer.route.stack.find((routeLayer) => {
        const handle = routeLayer.handle as Partial<RequireRoleMiddleware>;
        return Array.isArray(handle.allowedRoles);
      });
      const allowedRoles = (roleMiddleware?.handle as RequireRoleMiddleware | undefined)?.allowedRoles ?? [];

      if (allowedRoles.includes('visitante')) {
        assert.equal(method, 'get', `${routerName} ${layer.route.path}: visitante solo puede leer`);
      }

      if (allowedRoles.includes('supervisor')) {
        assert.equal(method, 'get', `${routerName} ${layer.route.path}: supervisor solo puede consultar`);
      }
    }
  }
});
