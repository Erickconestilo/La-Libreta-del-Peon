import type { AuthSessionUser, UserRole } from '@shared/types';

export const canCreateStationWithoutProject = (role: UserRole | null | undefined) => role === 'admin';

export const canWriteProject = (user: AuthSessionUser | null | undefined, projectId: string | null | undefined) => {
  if (!user || !projectId) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  // Supervisor remains read-only even if a membership is misconfigured as write.
  if (user.role !== 'topografo') {
    return false;
  }

  // A technical session without a server-provided access map cannot prove
  // write permission for this project. Fail closed until /auth/me refreshes it.
  if (user.projectAccess === undefined) {
    return false;
  }

  return user.projectAccess?.[projectId] === 'write';
};

export type WriteScreenAccessState = 'loading' | 'allowed' | 'read-only';

export const getWriteScreenAccessState = (
  user: AuthSessionUser | null | undefined,
  projectId: string | null | undefined,
  resourceLoaded: boolean
): WriteScreenAccessState => {
  if (!resourceLoaded) {
    return 'loading';
  }

  return canWriteProject(user, projectId) ? 'allowed' : 'read-only';
};

export const resolveStationProjectId = ({
  availableProjectIds,
  requestedProjectId,
  role
}: {
  availableProjectIds: string[];
  requestedProjectId?: string | null;
  role: UserRole | null | undefined;
}) => {
  if (role === 'admin') {
    return requestedProjectId ?? null;
  }

  if (requestedProjectId && availableProjectIds.includes(requestedProjectId)) {
    return requestedProjectId;
  }

  return availableProjectIds.length === 1 ? availableProjectIds[0] : null;
};
