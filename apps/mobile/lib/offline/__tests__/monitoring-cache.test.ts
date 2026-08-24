import { describe, expect, it, beforeEach } from '@jest/globals';

import { applyMigrations, closeDatabase, getDatabase } from '../database';
import {
  getCachedMonitoringRoundList,
  getMonitoringRoundSnapshot,
  saveMonitoringRoundList,
  saveMonitoringRoundSnapshot
} from '../monitoring-cache';

describe('monitoring cache', () => {
  beforeEach(async () => {
    closeDatabase();
    await applyMigrations();
    const db = getDatabase();
    db.runSync('DELETE FROM monitoring_round_list_cache');
    db.runSync('DELETE FROM monitoring_round_cache');
  });

  it('persists the latest round list and its timestamp', () => {
    const rounds = [{ id: 'round-1', projectId: 'project-1', name: 'Ronda', roundDate: '2026-08-24', status: 'draft' }] as never[];
    saveMonitoringRoundList('project-1', rounds as never);

    expect(getCachedMonitoringRoundList('project-1')).toMatchObject({
      cachedAt: expect.any(String),
      projectId: 'project-1',
      rounds
    });
  });

  it('persists the round context, readings and thresholds as one snapshot', () => {
    const snapshot = {
      cachedAt: '2026-08-24T10:00:00.000Z',
      readingsByControlPointId: { 'point-1': [] },
      round: { id: 'round-1', points: [] },
      thresholdsByControlPointId: { 'point-1': [] }
    } as never;

    saveMonitoringRoundSnapshot('round-1', snapshot);

    expect(getMonitoringRoundSnapshot('round-1')).toEqual(snapshot);
  });
});
