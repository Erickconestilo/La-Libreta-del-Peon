import { describe, expect, it } from '@jest/globals';
import type { WorkExecutionEvent } from '@shared/types';

import {
  getWorkExecutionDeliveryPresentation,
  getWorkExecutionDeliveryStatus,
  getWorkExecutionCurrentStatePresentation,
  getWorkExecutionState,
  getWorkExecutionStatePresentation,
  getWorkExecutionSummary,
  getNextWorkExecutionPointId,
  formatJourneyWorkSummary,
  getJourneyWorkSummary,
  getJourneyWorkWeek,
  requiresWorkExecutionReason,
  WORK_EXECUTION_REASON_OPTIONS
} from '../work-execution';
import type { OutboxItem } from '../offline/outbox';

const event = (eventType: WorkExecutionEvent['eventType']): WorkExecutionEvent => ({
  clientRequestId: '11111111-1111-4111-8111-111111111111',
  createdAt: '2026-09-13T10:00:00.000Z',
  eventType,
  id: '22222222-2222-4222-8222-222222222222',
  notes: null,
  occurredAt: '2026-09-13T10:00:00.000Z',
  projectId: '33333333-3333-4333-8333-333333333333',
  reason: eventType === 'blocked' ? 'Sin acceso' : null,
  recordedBy: '44444444-4444-4444-8444-444444444444',
  roundId: '55555555-5555-4555-8555-555555555555',
  roundPointId: '66666666-6666-4666-8666-666666666666'
});

const deliveryItem = (
  status: OutboxItem['status'],
  options: { retryCount?: number; syncErrorKind?: string } = {}
): Pick<OutboxItem, 'status' | 'retryCount' | 'conflictData'> => ({
  conflictData: options.syncErrorKind ? { syncErrorKind: options.syncErrorKind } : null,
  retryCount: options.retryCount ?? 0,
  status
});

describe('work execution status', () => {
  it('keeps operational result separate from pending monitoring status', () => {
    expect(getWorkExecutionState(null)).toEqual({ lastEvent: null, status: 'pending' });
    expect(getWorkExecutionState(event('completed')).status).toBe('completed');
    expect(getWorkExecutionState(event('repeat_required')).status).toBe('repeat_required');
  });

  it('requires reasons only for outcomes that need handoff context', () => {
    expect(requiresWorkExecutionReason('started')).toBe(false);
    expect(requiresWorkExecutionReason('completed')).toBe(false);
    expect(requiresWorkExecutionReason('not_done')).toBe(true);
    expect(requiresWorkExecutionReason('repeat_required')).toBe(true);
    expect(requiresWorkExecutionReason('blocked')).toBe(true);
  });

  it('offers neutral field reasons without replacing free-text context', () => {
    expect(WORK_EXECUTION_REASON_OPTIONS).toEqual([
      'Sin acceso',
      'Sin visibilidad',
      'Equipo o sensor dañado',
      'Condición de campo adversa',
      'Lectura dudosa, repetir'
    ]);
  });

  it('presents blocked work as a danger state, never as completed', () => {
    expect(getWorkExecutionStatePresentation(getWorkExecutionState(event('blocked')))).toEqual({
      label: 'Bloqueado',
      tone: 'danger'
    });
  });

  it('distinguishes local, retrying, received and conflict delivery states', () => {
    expect(getWorkExecutionDeliveryStatus(deliveryItem('pending'))).toBe('local_pending');
    expect(getWorkExecutionDeliveryStatus(deliveryItem('pending', { retryCount: 1 }))).toBe('retryable_error');
    expect(getWorkExecutionDeliveryStatus(deliveryItem('syncing'))).toBe('sending');
    expect(getWorkExecutionDeliveryStatus(deliveryItem('synced'))).toBe('received');
    expect(getWorkExecutionDeliveryStatus(deliveryItem('conflict'))).toBe('conflict');
  });

  it('keeps terminal backend/auth failures distinct from a server receipt', () => {
    expect(getWorkExecutionDeliveryStatus(deliveryItem('error', { syncErrorKind: 'backend_incompatible' })))
      .toBe('backend_incompatible');
    expect(getWorkExecutionDeliveryStatus(deliveryItem('error', { syncErrorKind: 'unauthorized' })))
      .toBe('unauthorized');
    expect(getWorkExecutionDeliveryStatus(deliveryItem('error', { syncErrorKind: 'forbidden' })))
      .toBe('forbidden');
    expect(getWorkExecutionDeliveryStatus(deliveryItem('error', { syncErrorKind: 'not_found' })))
      .toBe('not_found');
    expect(getWorkExecutionDeliveryPresentation(deliveryItem('error', { syncErrorKind: 'backend_incompatible' })).label)
      .toBe('Backend pendiente');
  });

  it('never presents an unconfirmed completed result as server-confirmed success', () => {
    const completedState = getWorkExecutionState(event('completed'));
    const localPending = {
      ...deliveryItem('pending'),
      clientRequestId: completedState.lastEvent?.clientRequestId ?? ''
    };
    const retrying = {
      ...deliveryItem('pending', { retryCount: 1 }),
      clientRequestId: completedState.lastEvent?.clientRequestId ?? ''
    };

    expect(getWorkExecutionCurrentStatePresentation(completedState, localPending)).toEqual({
      delivery: expect.objectContaining({ label: 'Pendiente local', tone: 'warning' }),
      result: { label: 'Hecho (local)', tone: 'warning' },
      source: 'local'
    });
    expect(getWorkExecutionCurrentStatePresentation(completedState, retrying)).toEqual({
      delivery: expect.objectContaining({ label: 'Reintento pendiente', tone: 'warning' }),
      result: { label: 'Hecho (local)', tone: 'warning' },
      source: 'local'
    });
  });

  it('restores the normal success presentation only after the matching item is synced', () => {
    const completedState = getWorkExecutionState(event('completed'));
    const synced = {
      ...deliveryItem('synced'),
      clientRequestId: completedState.lastEvent?.clientRequestId ?? ''
    };

    expect(getWorkExecutionCurrentStatePresentation(completedState, synced)).toEqual({
      delivery: null,
      result: { label: 'Hecho', tone: 'success' },
      source: 'server'
    });
  });

  it('summarises operational progress without changing metrological status', () => {
    const summary = getWorkExecutionSummary([
      {},
      { executionState: getWorkExecutionState(event('started')) },
      { executionState: getWorkExecutionState(event('completed')) },
      { executionState: getWorkExecutionState(event('blocked')) }
    ]);

    expect(summary).toEqual({
      blocked: 1,
      completed: 1,
      in_progress: 1,
      not_done: 0,
      pending: 1,
      repeat_required: 0,
      total: 4
    });
  });

  it('keeps the configured order when selecting the next actionable point', () => {
    expect(getNextWorkExecutionPointId([
      { id: 'blocked-first', executionState: getWorkExecutionState(event('blocked')) },
      { id: 'repeat-second', executionState: getWorkExecutionState(event('repeat_required')) },
      { id: 'completed-third', executionState: getWorkExecutionState(event('completed')) }
    ])).toBe('repeat-second');

    expect(getNextWorkExecutionPointId([
      { id: 'completed-only', executionState: getWorkExecutionState(event('completed')) },
      { id: 'blocked-only', executionState: getWorkExecutionState(event('blocked')) }
    ])).toBeNull();
  });

  it('keeps pending work separate from items that need review', () => {
    expect(formatJourneyWorkSummary({
      workCompletedPointCount: 2,
      workInProgressPointCount: 1,
      workPendingPointCount: 3,
      workReviewPointCount: 4
    })).toBe('2 hechos · 1 en curso · 3 pendientes · 4 por revisar');
  });

  it('aggregates assigned work for the daily report', () => {
    expect(getJourneyWorkSummary([
      { workCompletedPointCount: 2, workInProgressPointCount: 1, workPendingPointCount: 3, workReviewPointCount: 1 },
      { workCompletedPointCount: 1, workInProgressPointCount: 0, workPendingPointCount: 2, workReviewPointCount: 0 }
    ])).toEqual({ completed: 3, inProgress: 1, pending: 5, review: 1, total: 10 });
  });

  it('groups assigned rounds into the working week without losing other dates', () => {
    const base = {
      createdAt: '2026-09-01T08:00:00.000Z',
      executionOrder: 0,
      fieldConditions: null,
      id: 'round',
      instrumentSerial: null,
      operatorId: 'operator-1',
      pendingPointCount: 1,
      projectCode: 'PROJECT',
      projectId: 'project-1',
      projectName: 'Obra',
      createdBy: 'admin-1',
      name: 'Ronda',
      status: 'active' as const,
      takenPointCount: 0,
      totalPointCount: 1,
      roundDate: '2026-09-14',
      updatedAt: '2026-09-01T08:00:00.000Z'
    };
    const week = getJourneyWorkWeek([
      { ...base, id: 'friday', name: 'Viernes', roundDate: '2026-09-18', executionOrder: 1 },
      { ...base, id: 'monday', name: 'Lunes', roundDate: '2026-09-14', executionOrder: 2 },
      { ...base, id: 'saturday', name: 'Fuera', roundDate: '2026-09-19' }
    ], new Date(2026, 8, 16, 12));

    expect(week.startDate).toBe('2026-09-14');
    expect(week.endDate).toBe('2026-09-18');
    expect(week.days[0].label).toBe('LUNES');
    expect(week.days[0].rounds.map((round) => round.id)).toEqual(['monday']);
    expect(week.days[4].rounds.map((round) => round.id)).toEqual(['friday']);
    expect(week.outsideWeek.map((round) => round.id)).toEqual(['saturday']);
  });
});
