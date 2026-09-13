import { describe, expect, it } from '@jest/globals';
import type { WorkExecutionEvent } from '@shared/types';

import {
  getWorkExecutionState,
  getWorkExecutionStatePresentation,
  getWorkExecutionSummary,
  getNextWorkExecutionPointId,
  formatJourneyWorkSummary,
  requiresWorkExecutionReason,
  WORK_EXECUTION_REASON_OPTIONS
} from '../work-execution';

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
});
