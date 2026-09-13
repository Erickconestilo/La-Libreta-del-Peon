import { describe, expect, it } from '@jest/globals';
import type { WorkExecutionEvent } from '@shared/types';

import {
  getWorkExecutionState,
  getWorkExecutionStatePresentation,
  requiresWorkExecutionReason
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

  it('presents blocked work as a danger state, never as completed', () => {
    expect(getWorkExecutionStatePresentation(getWorkExecutionState(event('blocked')))).toEqual({
      label: 'Bloqueado',
      tone: 'danger'
    });
  });
});
