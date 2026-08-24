import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import type { JourneyRound } from '@shared/types';

import { applyMigrations, closeDatabase, getDatabase } from '../database';
import { deferJourneyRound, getCachedJourney, getDeferredJourneyRoundIds, saveJourney } from '../journey-cache';

const round = {
  createdAt: '2026-08-24T00:00:00.000Z',
  createdBy: 'user-1',
  executionOrder: 1,
  fieldConditions: null,
  id: 'round-1',
  instrumentSerial: null,
  name: 'Jornada de prueba',
  operatorId: 'user-1',
  projectCode: 'DEMO',
  projectId: 'project-1',
  projectName: 'Obra demo',
  roundDate: '2026-08-24',
  status: 'active' as const,
  pendingPointCount: 1,
  takenPointCount: 0,
  totalPointCount: 1,
  updatedAt: '2026-08-24T00:00:00.000Z'
} satisfies JourneyRound;

describe('Journey cache', () => {
  beforeEach(async () => {
    await applyMigrations();
    getDatabase().runSync('DELETE FROM journey_cache');
    getDatabase().runSync('DELETE FROM journey_deferred');
  });

  afterEach(() => closeDatabase());

  it('persists the journey per session', () => {
    saveJourney('session:one', [round]);
    expect(getCachedJourney('session:one')?.rounds).toEqual([round]);
    expect(getCachedJourney('session:two')).toBeNull();
  });

  it('defers a round only until the configured time', () => {
    deferJourneyRound('session:one', round.id, '2026-08-24T23:59:59.000Z');
    expect(getDeferredJourneyRoundIds('session:one', '2026-08-24T12:00:00.000Z')).toEqual(new Set(['round-1']));
    expect(getDeferredJourneyRoundIds('session:one', '2026-08-25T00:00:00.000Z')).toEqual(new Set());
  });
});
