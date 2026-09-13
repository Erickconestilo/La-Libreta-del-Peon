import type {
  WorkExecutionEvent,
  WorkExecutionEventType,
  WorkExecutionState,
  WorkExecutionStateStatus
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
