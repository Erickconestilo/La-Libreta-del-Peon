import { AppError } from './app-error.js';
import type { AuthenticatedUser } from '../types/express.js';

export const getActorProjectScope = (user: AuthenticatedUser | undefined | null): string[] | null => {
  if (!user) {
    return null;
  }

  if (user.role === 'admin' || user.role === 'visitante') {
    return null;
  }

  return user.projectIds ?? [];
};

export const assertProjectAccess = (
  user: AuthenticatedUser,
  projectId: unknown,
  forbiddenMessage = 'No estás autorizado para esta obra'
) => {
  if (user.role === 'admin' || user.role === 'visitante') {
    return;
  }

  const projectIds = user.projectIds ?? [];

  if (typeof projectId !== 'string' || !projectId) {
    throw new AppError('Project access requires a valid project for this role', 403, 'PROJECT_REQUIRED');
  }

  if (projectIds.length === 0 || !projectIds.includes(projectId)) {
    throw new AppError(forbiddenMessage, 403, 'FORBIDDEN_PROJECT_ACCESS');
  }
};

/**
 * Consulta de obra y escritura de obra son permisos distintos. El mapa se
 * carga desde las membresías activas; si no existe (sesiones legacy o tests
 * antiguos), se conserva el comportamiento previo de topógrafo = escritura.
 */
export const assertProjectWriteAccess = (
  user: AuthenticatedUser | undefined,
  projectId: unknown,
  forbiddenMessage = 'No estás autorizado para modificar esta obra'
) => {
  if (!user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  assertProjectAccess(user, projectId, forbiddenMessage);

  if (user.role === 'admin' || user.role === 'visitante') {
    if (user.role === 'visitante') {
      throw new AppError(forbiddenMessage, 403, 'READ_ONLY_ACCESS');
    }
    return;
  }

  if (typeof projectId === 'string' && user.projectAccess?.[projectId] === 'read') {
    throw new AppError(forbiddenMessage, 403, 'READ_ONLY_PROJECT_MEMBERSHIP');
  }
};

export const canActorAccessProject = (user: AuthenticatedUser, projectId: unknown): boolean => {
  if (user.role === 'admin' || user.role === 'visitante') {
    return true;
  }

  const projectIds = user.projectIds ?? [];

  if (typeof projectId !== 'string' || !projectId) {
    return false;
  }

  return projectIds.includes(projectId);
};

export const canActorWriteProject = (user: AuthenticatedUser, projectId: unknown): boolean => {
  try {
    assertProjectWriteAccess(user, projectId);
    return true;
  } catch {
    return false;
  }
};

export const assertTopografoHasScopedResource = (
  user: AuthenticatedUser,
  hasScopedResource: boolean
) => {
  if (user.role === 'topografo' && !hasScopedResource) {
    throw new AppError(
      'A project-scoped resource is required for this operation',
      403,
      'PROJECT_REQUIRED'
    );
  }
};
