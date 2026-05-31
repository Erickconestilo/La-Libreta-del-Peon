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
  projectId: string | null,
  forbiddenMessage = 'No estás autorizado para esta obra'
) => {
  if (user.role === 'admin' || user.role === 'visitante') {
    return;
  }

  const projectIds = user.projectIds ?? [];

  if (!projectId) {
    throw new AppError('Project access requires a valid project for this role', 403, 'PROJECT_REQUIRED');
  }

  if (projectIds.length === 0 || !projectIds.includes(projectId)) {
    throw new AppError(forbiddenMessage, 403, 'FORBIDDEN_PROJECT_ACCESS');
  }
};

export const canActorAccessProject = (user: AuthenticatedUser, projectId: string | null): boolean => {
  if (user.role === 'admin' || user.role === 'visitante') {
    return true;
  }

  const projectIds = user.projectIds ?? [];

  if (!projectId) {
    return false;
  }

  return projectIds.includes(projectId);
};
