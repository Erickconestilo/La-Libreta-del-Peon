import type { UserRole } from '@shared/types';

export const canCreateStationWithoutProject = (role: UserRole | null | undefined) => role === 'admin';

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
