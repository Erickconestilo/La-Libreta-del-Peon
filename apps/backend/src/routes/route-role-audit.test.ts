import test from 'node:test';
import assert from 'node:assert/strict';

import type { Router } from 'express';

import { controlPointsRouter, roundsRouter } from './monitoring.routes.js';
import { projectsRouter } from './projects.routes.js';
import type { RequireRoleMiddleware } from '../middleware/auth.js';

/**
 * Audita directamente los routers reales, no una copia a mano de la lista
 * de roles: si alguien reintroduce 'visitante' en una ruta de auscultación
 * (por ejemplo copiando el patrón de una ruta pública para una nueva),
 * esta prueba falla sin depender de que alguien recuerde actualizar un test
 * en paralelo. Existe porque el 02-08-2026 se quitó 'visitante' de 5 rutas
 * (D1, ver ROADMAP.md) y hasta entonces no había ninguna prueba que
 * protegiera esa decisión de una regresión silenciosa.
 */

type RouteExpectation = {
  method: string;
  path: string;
  mustExcludeVisitante: boolean;
};

const auscultacionRoutesFromRoundsRouter: RouteExpectation[] = [
  { method: 'get', path: '/:roundId', mustExcludeVisitante: true }
];

const auscultacionRoutesFromControlPointsRouter: RouteExpectation[] = [
  { method: 'get', path: '/:controlPointId/readings', mustExcludeVisitante: true },
  { method: 'get', path: '/:controlPointId/thresholds', mustExcludeVisitante: true }
];

const auscultacionRoutesFromProjectsRouter: RouteExpectation[] = [
  { method: 'get', path: '/:projectId/rounds', mustExcludeVisitante: true },
  { method: 'get', path: '/:projectId/control-points', mustExcludeVisitante: true }
];

const findAllowedRoles = (router: Router, method: string, path: string): Array<'admin' | 'topografo' | 'visitante'> | null => {
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
auditRouter('controlPointsRouter', controlPointsRouter, auscultacionRoutesFromControlPointsRouter);
auditRouter('projectsRouter', projectsRouter, auscultacionRoutesFromProjectsRouter);
