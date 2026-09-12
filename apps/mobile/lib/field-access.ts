import type { AuthSessionUser, UserRole } from '@shared/types';

export const canCreateStationWithoutProject = (role: UserRole | null | undefined) => role === 'admin';

export const canWriteProject = (user: AuthSessionUser | null | undefined, projectId: string | null | undefined) => {
  if (!user || !projectId) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  if (user.role !== 'topografo') {
    return false;
  }

  // Legacy sessions have no access map yet; the backend remains the final guard.
  if (user.projectAccess === undefined) {
    return true;
  }

  return user.projectAccess?.[projectId] === 'write';
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
