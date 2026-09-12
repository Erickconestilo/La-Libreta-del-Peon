import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import type { MountingVisit } from '@shared/types';

import { applyMigrations, closeDatabase, getDatabase } from '../database';
import {
  getCachedMountingVisits,
  mergeServerMountingVisits,
  saveMountingVisits,
  type CachedMountingVisit
} from '../mounting-cache';

const cachedPendingVisit: CachedMountingVisit = {
  changeSummary: 'Cambio local',
  clientRequestId: '7c0f6d27-bb52-43bb-a41a-a10ee1c37b99',
  createdAt: '2026-09-12T09:00:00.000Z',
  evidence: [],
  id: 'local-visit-id',
  notes: 'Sin cobertura',
  projectId: 'project-1',
  recordedBy: 'user-1',
  stationId: 'station-1',
  status: 'draft',
  syncState: 'pending',
  updatedAt: '2026-09-12T09:00:00.000Z',
  visitedAt: '2026-09-12T09:00:00.000Z'
};

describe('mounting visit cache', () => {
  beforeEach(async () => {
    closeDatabase();
    await applyMigrations();
    getDatabase().runSync('DELETE FROM mounting_visit_cache');
  });

  afterEach(() => closeDatabase());

  it('persists visits per technical session and station', () => {
    saveMountingVisits('session:one', 'station-1', [cachedPendingVisit]);

    expect(getCachedMountingVisits('session:one', 'station-1')?.visits).toEqual([cachedPendingVisit]);
    expect(getCachedMountingVisits('session:two', 'station-1')).toBeNull();
    expect(getCachedMountingVisits('session:one', 'station-2')).toBeNull();
  });

  it('keeps pending local visits when the server list is empty', () => {
    expect(mergeServerMountingVisits([], [cachedPendingVisit])).toEqual([cachedPendingVisit]);
  });

  it('replaces the local visit by clientRequestId after server sync', () => {
    const serverVisit = {
      ...cachedPendingVisit,
      id: 'server-visit-id',
      notes: 'Versión del servidor',
      syncState: undefined
    } as unknown as MountingVisit;

    expect(mergeServerMountingVisits([serverVisit], [cachedPendingVisit])).toEqual([
      expect.objectContaining({ id: 'server-visit-id', notes: 'Versión del servidor' })
    ]);
  });
});
