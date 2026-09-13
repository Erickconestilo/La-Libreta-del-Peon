import type { MountingEvidence, MountingEvidenceKind, MountingVisit, MountingVisitStatus } from '@shared/types';

export const MOUNTING_PHOTO_SIZE = 132;

export type MountingVisualFilter = 'all' | MountingEvidenceKind;
export type MountingVisualEvidence = MountingEvidence & { localUri?: string };
export type MountingVisitStatusFilter = 'all' | MountingVisitStatus;
export type MountingVisitStatusTone = 'success' | 'warning' | 'danger';
export type MountingVisitStatusPresentation = {
  label: string;
  tone: MountingVisitStatusTone;
};

export const MOUNTING_VISUAL_FILTERS: Array<{ key: MountingVisualFilter; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'prism', label: 'Prismas' },
  { key: 'reference', label: 'Referencias' },
  { key: 'access', label: 'Accesos' }
];

export const MOUNTING_STATUS_FILTERS: Array<{ key: MountingVisitStatusFilter; label: string }> = [
  { key: 'all', label: 'Todos los estados' },
  { key: 'draft', label: 'En curso' },
  { key: 'completed', label: 'Realizadas' },
  { key: 'blocked', label: 'No realizables' }
];

export const MOUNTING_BLOCK_REASON_OPTIONS = [
  'Sin acceso',
  'Sin visibilidad',
  'Equipo o sensor dañado',
  'Condición de campo adversa'
] as const;

export const getMountingVisitStatusPresentation = (status: MountingVisitStatus): MountingVisitStatusPresentation => {
  if (status === 'blocked') {
    return { label: 'No realizable', tone: 'danger' };
  }

  if (status === 'completed') {
    return { label: 'Realizada', tone: 'success' };
  }

  return { label: 'En curso', tone: 'warning' };
};

export const buildMountingBlockedNotes = (existingNotes: string | null, reason: string) => {
  const trimmedReason = reason.trim();
  const reasonLine = `Motivo de no realización: ${trimmedReason}`;

  return [existingNotes?.trim(), reasonLine].filter(Boolean).join('\n');
};

export const filterMountingVisitsForVisual = <T extends MountingVisit>(
  visits: T[],
  filter: MountingVisualFilter
): T[] => {
  if (filter === 'all') {
    return visits;
  }

  return visits
    .filter((visit) => visit.evidence.some((evidence) => evidence.kind === filter))
    .map((visit) => ({
      ...visit,
      evidence: visit.evidence.filter((evidence) => evidence.kind === filter)
    })) as T[];
};

export const getMountingEvidenceUri = (evidence: MountingVisualEvidence) => evidence.localUri ?? evidence.publicUrl;

export const filterMountingVisitsForStatus = <T extends MountingVisit>(
  visits: T[],
  filter: MountingVisitStatusFilter
): T[] => filter === 'all' ? visits : visits.filter((visit) => visit.status === filter);

export const MOUNTING_PHOTO_ANCHORS = [
  { key: 'top-left', label: 'Arriba izquierda', x: 0.2, y: 0.2 },
  { key: 'top-center', label: 'Arriba centro', x: 0.5, y: 0.2 },
  { key: 'top-right', label: 'Arriba derecha', x: 0.8, y: 0.2 },
  { key: 'middle-left', label: 'Centro izquierda', x: 0.2, y: 0.5 },
  { key: 'middle-center', label: 'Centro', x: 0.5, y: 0.5 },
  { key: 'middle-right', label: 'Centro derecha', x: 0.8, y: 0.5 },
  { key: 'bottom-left', label: 'Abajo izquierda', x: 0.2, y: 0.8 },
  { key: 'bottom-center', label: 'Abajo centro', x: 0.5, y: 0.8 },
  { key: 'bottom-right', label: 'Abajo derecha', x: 0.8, y: 0.8 }
] as const;

export type MountingPhotoAnchorKey = (typeof MOUNTING_PHOTO_ANCHORS)[number]['key'];

export const getMountingPhotoMarkerPosition = (
  positionX: number,
  positionY: number,
  size = MOUNTING_PHOTO_SIZE
) => {
  const clamp = (value: number) => Math.min(1, Math.max(0, value));

  return {
    left: Math.round(clamp(positionX) * size) - 12,
    top: Math.round(clamp(positionY) * size) - 12
  };
};
