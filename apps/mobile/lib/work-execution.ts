import type {
  WorkExecutionEvent,
  WorkExecutionEventType,
  WorkExecutionState,
  WorkExecutionStateStatus,
  MonitoringRoundPoint,
  JourneyRound
} from '@shared/types';

export const WORK_EXECUTION_OPTIONS: Array<{
  eventType: WorkExecutionEventType;
  icon: 'block' | 'check-circle' | 'flag' | 'play-arrow' | 'refresh';
  label: string;
}> = [
  { eventType: 'started', icon: 'play-arrow', label: 'Empezar' },
  { eventType: 'completed', icon: 'check-circle', label: 'Hecho' },
  { eventType: 'not_done', icon: 'block', label: 'No realizado' },
  { eventType: 'repeat_required', icon: 'refresh', label: 'Repetir' },
  { eventType: 'blocked', icon: 'flag', label: 'Bloqueado' }
];

export const WORK_EXECUTION_REASON_OPTIONS = [
  'Sin acceso',
  'Sin visibilidad',
  'Equipo o sensor dañado',
  'Condición de campo adversa',
  'Lectura dudosa, repetir'
] as const;

export const WORK_EXECUTION_STATUS_PRESENTATION: Record<WorkExecutionStateStatus, { label: string; tone: 'danger' | 'neutral' | 'success' | 'warning' }> = {
  blocked: { label: 'Bloqueado', tone: 'danger' },
  completed: { label: 'Hecho', tone: 'success' },
  in_progress: { label: 'En curso', tone: 'warning' },
  not_done: { label: 'No realizado', tone: 'danger' },
  pending: { label: 'Pendiente', tone: 'neutral' },
  repeat_required: { label: 'Repetir', tone: 'warning' }
};

export const requiresWorkExecutionReason = (eventType: WorkExecutionEventType) => (
  eventType === 'not_done' || eventType === 'repeat_required' || eventType === 'blocked'
);

export const getWorkExecutionState = (event: WorkExecutionEvent | null): WorkExecutionState => {
  if (!event) {
    return { lastEvent: null, status: 'pending' };
  }

  if (event.eventType === 'started') return { lastEvent: event, status: 'in_progress' };
  if (event.eventType === 'completed') return { lastEvent: event, status: 'completed' };
  if (event.eventType === 'not_done') return { lastEvent: event, status: 'not_done' };
  if (event.eventType === 'repeat_required') return { lastEvent: event, status: 'repeat_required' };
  return { lastEvent: event, status: 'blocked' };
};

export const getWorkExecutionStatePresentation = (state?: WorkExecutionState | null) => (
  WORK_EXECUTION_STATUS_PRESENTATION[state?.status ?? 'pending']
);

export type WorkExecutionSummary = Record<WorkExecutionStateStatus, number> & {
  total: number;
};

export type JourneyWorkSummary = {
  completed: number;
  inProgress: number;
  pending: number;
  review: number;
  total: number;
};

export const getWorkExecutionSummary = (
  points: Array<Pick<MonitoringRoundPoint, 'executionState'>>
): WorkExecutionSummary => {
  const summary: WorkExecutionSummary = {
    blocked: 0,
    completed: 0,
    in_progress: 0,
    not_done: 0,
    pending: 0,
    repeat_required: 0,
    total: points.length
  };

  for (const point of points) {
    summary[point.executionState?.status ?? 'pending'] += 1;
  }

  return summary;
};

export const formatJourneyWorkSummary = (
  round: Pick<JourneyRound, 'workCompletedPointCount' | 'workInProgressPointCount' | 'workPendingPointCount' | 'workReviewPointCount'>
) => [
  `${round.workCompletedPointCount ?? 0} hechos`,
  `${round.workInProgressPointCount ?? 0} en curso`,
  `${round.workPendingPointCount ?? 0} pendientes`,
  `${round.workReviewPointCount ?? 0} por revisar`
].join(' · ');

export const getJourneyWorkSummary = (
  rounds: Array<Pick<JourneyRound, 'workCompletedPointCount' | 'workInProgressPointCount' | 'workPendingPointCount' | 'workReviewPointCount'>>
): JourneyWorkSummary => rounds.reduce<JourneyWorkSummary>((summary, round) => {
  const completed = round.workCompletedPointCount ?? 0;
  const inProgress = round.workInProgressPointCount ?? 0;
  const pending = round.workPendingPointCount ?? 0;
  const review = round.workReviewPointCount ?? 0;

  return {
    completed: summary.completed + completed,
    inProgress: summary.inProgress + inProgress,
    pending: summary.pending + pending,
    review: summary.review + review,
    total: summary.total + completed + inProgress + pending + review
  };
}, { completed: 0, inProgress: 0, pending: 0, review: 0, total: 0 });

/** Keeps the round order while prioritising work that can still be continued. */
export const getNextWorkExecutionPointId = (
  points: Array<Pick<MonitoringRoundPoint, 'id' | 'executionState'>>
) => points.find((point) => {
  const status = point.executionState?.status ?? 'pending';
  return status !== 'completed' && status !== 'blocked';
})?.id ?? null;
