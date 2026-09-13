import type {
  WorkExecutionEvent,
  WorkExecutionEventType,
  WorkExecutionState,
  WorkExecutionStateStatus,
  MonitoringRoundPoint,
  JourneyRound
} from '@shared/types';
import type { OutboxItem } from './offline/outbox';
import type { SyncErrorKind } from './offline/sync-engine';

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

export type WorkExecutionDeliveryStatus =
  | 'local_pending'
  | 'sending'
  | 'retryable_error'
  | 'received'
  | 'conflict'
  | 'backend_incompatible'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'error';

export const WORK_EXECUTION_DELIVERY_PRESENTATION: Record<WorkExecutionDeliveryStatus, {
  detail: string;
  label: string;
  tone: 'danger' | 'neutral' | 'success' | 'warning';
}> = {
  backend_incompatible: {
    detail: 'La app conserva el resultado, pero esta versión del servidor todavía no publica la ruta necesaria.',
    label: 'Backend pendiente',
    tone: 'danger'
  },
  conflict: {
    detail: 'El servidor detectó un conflicto. No se reintentará automáticamente.',
    label: 'Conflicto',
    tone: 'danger'
  },
  error: {
    detail: 'El resultado sigue guardado en el dispositivo y necesita revisión antes de reenviarse.',
    label: 'Error de envío',
    tone: 'danger'
  },
  forbidden: {
    detail: 'El servidor rechazó el envío por permisos. El resultado local no cuenta como recibido.',
    label: 'Sin permiso',
    tone: 'danger'
  },
  local_pending: {
    detail: 'Guardado en este dispositivo. Aún no existe confirmación del servidor.',
    label: 'Pendiente local',
    tone: 'warning'
  },
  not_found: {
    detail: 'El servidor no encontró el recurso de destino. El resultado local necesita revisión.',
    label: 'Destino no encontrado',
    tone: 'danger'
  },
  received: {
    detail: 'El servidor confirmó la recepción de esta acción.',
    label: 'Recibido servidor',
    tone: 'success'
  },
  retryable_error: {
    detail: 'El último envío falló de forma transitoria. Se reintentará con espera progresiva.',
    label: 'Reintento pendiente',
    tone: 'warning'
  },
  sending: {
    detail: 'Enviando el resultado conservado localmente.',
    label: 'Enviando',
    tone: 'neutral'
  },
  unauthorized: {
    detail: 'La sesión del servidor no acepta el envío. El resultado local no cuenta como recibido.',
    label: 'Sesión requerida',
    tone: 'danger'
  }
};

const getPersistedSyncErrorKind = (item: Pick<OutboxItem, 'conflictData'>): SyncErrorKind | null => {
  const kind = item.conflictData?.syncErrorKind;
  return typeof kind === 'string' ? kind as SyncErrorKind : null;
};

export const getWorkExecutionDeliveryStatus = (
  item: Pick<OutboxItem, 'status' | 'retryCount' | 'conflictData'>
): WorkExecutionDeliveryStatus => {
  if (item.status === 'synced') return 'received';
  if (item.status === 'conflict') return 'conflict';
  if (item.status === 'syncing') return 'sending';
  if (item.status === 'pending') return item.retryCount > 0 ? 'retryable_error' : 'local_pending';

  const kind = getPersistedSyncErrorKind(item);
  if (kind === 'backend_incompatible' || kind === 'unauthorized' || kind === 'forbidden' || kind === 'not_found') {
    return kind;
  }
  return 'error';
};

export const getWorkExecutionDeliveryPresentation = (
  item: Pick<OutboxItem, 'status' | 'retryCount' | 'conflictData'>
) => WORK_EXECUTION_DELIVERY_PRESENTATION[getWorkExecutionDeliveryStatus(item)];

export const getWorkExecutionCurrentStatePresentation = (
  state: WorkExecutionState | null | undefined,
  deliveryItem?: Pick<OutboxItem, 'clientRequestId' | 'status' | 'retryCount' | 'conflictData'> | null
) => {
  const statePresentation = getWorkExecutionStatePresentation(state);
  const localEventId = state?.lastEvent?.clientRequestId ?? null;
  const deliveryMatchesCurrentEvent = Boolean(
    localEventId && deliveryItem?.clientRequestId === localEventId
  );

  if (!deliveryItem || !deliveryMatchesCurrentEvent || deliveryItem.status === 'synced') {
    return {
      delivery: null,
      result: statePresentation,
      source: 'server' as const
    };
  }

  const delivery = getWorkExecutionDeliveryPresentation(deliveryItem);
  return {
    delivery,
    result: {
      label: `${statePresentation.label} (local)`,
      tone: delivery.tone === 'success' ? 'warning' as const : delivery.tone
    },
    source: 'local' as const
  };
};

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

export type JourneyWeekDay = {
  date: string;
  label: string;
  rounds: JourneyRound[];
};

export type JourneyWorkWeek = {
  startDate: string;
  endDate: string;
  days: JourneyWeekDay[];
  outsideWeek: JourneyRound[];
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

const WEEKDAY_LABELS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'];

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const sortJourneyRounds = (left: JourneyRound, right: JourneyRound) => (
  left.executionOrder - right.executionOrder ||
  left.createdAt.localeCompare(right.createdAt) ||
  left.id.localeCompare(right.id)
);

/** Groups assigned rounds into the five working days shown in the field workbook. */
export const getJourneyWorkWeek = (
  rounds: JourneyRound[],
  referenceDate = new Date()
): JourneyWorkWeek => {
  const localDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 12);
  const dayFromMonday = (localDate.getDay() + 6) % 7;
  const monday = new Date(localDate);
  monday.setDate(localDate.getDate() - dayFromMonday);
  const days = WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { date: toDateKey(date), label, rounds: [] as JourneyRound[] };
  });
  const knownDates = new Map(days.map((day, index) => [day.date, index]));
  const outsideWeek: JourneyRound[] = [];

  for (const round of rounds) {
    const roundDate = round.roundDate.slice(0, 10);
    const dayIndex = knownDates.get(roundDate);
    if (dayIndex === undefined) {
      outsideWeek.push(round);
      continue;
    }

    days[dayIndex].rounds.push(round);
  }

  for (const day of days) {
    day.rounds.sort(sortJourneyRounds);
  }
  outsideWeek.sort((left, right) => left.roundDate.localeCompare(right.roundDate) || sortJourneyRounds(left, right));

  return {
    days,
    endDate: days[days.length - 1].date,
    outsideWeek,
    startDate: days[0].date
  };
};

/** Keeps the round order while prioritising work that can still be continued. */
export const getNextWorkExecutionPointId = (
  points: Array<Pick<MonitoringRoundPoint, 'id' | 'executionState'>>
) => points.find((point) => {
  const status = point.executionState?.status ?? 'pending';
  return status !== 'completed' && status !== 'blocked';
})?.id ?? null;
