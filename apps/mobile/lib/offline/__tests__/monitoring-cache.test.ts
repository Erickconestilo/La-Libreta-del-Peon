import { describe, expect, it, beforeEach } from '@jest/globals';

import { applyMigrations, closeDatabase, getDatabase } from '../database';
import {
  getCachedMonitoringRoundList,
  getMonitoringRoundSnapshot,
  applyCachedWorkExecutionEvent,
  saveMonitoringRoundList,
  saveMonitoringRoundsByProject,
  saveMonitoringRoundSnapshot
} from '../monitoring-cache';

describe('monitoring cache', () => {
  beforeEach(async () => {
    closeDatabase();
    await applyMigrations();
    const db = getDatabase();
    db.runSync('DELETE FROM monitoring_round_list_cache');
    db.runSync('DELETE FROM monitoring_round_cache');
    db.runSync('DELETE FROM mounting_visit_cache');
  });

  it('persists the latest round list and its timestamp', () => {
    const rounds = [{ id: 'round-1', projectId: 'project-1', name: 'Ronda', roundDate: '2026-08-24', status: 'draft' }] as never[];
    saveMonitoringRoundList('session:one', 'project-1', rounds as never);

    expect(getCachedMonitoringRoundList('session:one', 'project-1')).toMatchObject({
      cachedAt: expect.any(String),
      projectId: 'project-1',
      rounds
    });
    expect(getCachedMonitoringRoundList('session:two', 'project-1')).toBeNull();
  });

  it('seeds project lists from a cached journey without mixing projects', () => {
    const rounds = [
      { id: 'round-1', projectId: 'project-1', name: 'Ronda 1', roundDate: '2026-08-24', status: 'draft' },
      { id: 'round-2', projectId: 'project-2', name: 'Ronda 2', roundDate: '2026-08-25', status: 'active' },
      { id: 'round-3', projectId: 'project-1', name: 'Ronda 3', roundDate: '2026-08-26', status: 'active' }
    ] as never[];

    saveMonitoringRoundsByProject('session:one', rounds as never, '2026-09-13T06:00:00.000Z');

    expect(getCachedMonitoringRoundList('session:one', 'project-1')).toMatchObject({
      cachedAt: '2026-09-13T06:00:00.000Z',
      rounds: [rounds[0], rounds[2]]
    });
    expect(getCachedMonitoringRoundList('session:one', 'project-2')).toMatchObject({
      cachedAt: '2026-09-13T06:00:00.000Z',
      rounds: [rounds[1]]
    });
    expect(getCachedMonitoringRoundList('session:two', 'project-1')).toBeNull();
  });

  it('persists the round context, readings and thresholds as one snapshot', () => {
    const snapshot = {
      cachedAt: '2026-08-24T10:00:00.000Z',
      readingsByControlPointId: { 'point-1': [] },
      round: { id: 'round-1', points: [] },
      thresholdsByControlPointId: { 'point-1': [] }
    } as never;

    saveMonitoringRoundSnapshot('session:one', 'round-1', snapshot);

    expect(getMonitoringRoundSnapshot('session:one', 'round-1')).toEqual(snapshot);
    expect(getMonitoringRoundSnapshot('session:two', 'round-1')).toBeNull();
  });

  it('keeps a locally recorded work result after a cold offline read', () => {
    const snapshot = {
      cachedAt: '2026-08-24T10:00:00.000Z',
      readingsByControlPointId: {},
      round: {
        id: 'round-1',
        points: [{ id: 'round-point-1', status: 'pending' }]
      },
      thresholdsByControlPointId: {}
    } as never;
    const event = {
      clientRequestId: '11111111-1111-4111-8111-111111111111',
      createdAt: '2026-09-13T10:00:00.000Z',
      eventType: 'blocked',
      id: 'event-1',
      notes: null,
      occurredAt: '2026-09-13T10:00:00.000Z',
      projectId: 'project-1',
      reason: 'Sin acceso',
      recordedBy: 'user-1',
      roundId: 'round-1',
      roundPointId: 'round-point-1'
    } as never;

    saveMonitoringRoundSnapshot('session:one', 'round-1', snapshot);
    applyCachedWorkExecutionEvent('session:one', 'round-1', 'round-point-1', event);

    expect(getMonitoringRoundSnapshot('session:one', 'round-1')?.round.points[0].executionState).toMatchObject({
      status: 'blocked',
      lastEvent: { reason: 'Sin acceso' }
    });
  });

  it('invalidates unscoped legacy cache rows during migration', async () => {
    const db = getDatabase();
    db.runSync('DELETE FROM schema_version WHERE version >= 5');
    db.execSync('DROP TABLE outbox');
    db.execSync(`
      CREATE TABLE outbox (
        id TEXT PRIMARY KEY,
        client_request_id TEXT NOT NULL UNIQUE,
        entity_type TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at TEXT,
        last_sync_attempt_at TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        conflict_data TEXT
      );
      DROP TABLE monitoring_round_list_cache;
      DROP TABLE monitoring_round_cache;
      CREATE TABLE monitoring_round_list_cache (
        project_id TEXT PRIMARY KEY,
        rounds_json TEXT NOT NULL,
        cached_at TEXT NOT NULL
      );
      CREATE TABLE monitoring_round_cache (
        round_id TEXT PRIMARY KEY,
        snapshot_json TEXT NOT NULL,
        cached_at TEXT NOT NULL
      );
      INSERT INTO monitoring_round_list_cache (project_id, rounds_json, cached_at)
      VALUES ('project-1', '[]', '2026-09-12T00:00:00.000Z');
      INSERT INTO monitoring_round_cache (round_id, snapshot_json, cached_at)
      VALUES ('round-1', '{}', '2026-09-12T00:00:00.000Z');
    `);

    await applyMigrations();

    expect(getCachedMonitoringRoundList('session:one', 'project-1')).toBeNull();
    expect(getMonitoringRoundSnapshot('session:one', 'round-1')).toBeNull();
  });
});
