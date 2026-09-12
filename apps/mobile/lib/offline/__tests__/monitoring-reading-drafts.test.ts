import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';

import { applyMigrations, closeDatabase, getDatabase } from '../database';
import {
  clearMonitoringReadingDraft,
  getMonitoringReadingDraft,
  saveMonitoringReadingDraft,
  type MonitoringReadingDraft
} from '../monitoring-reading-drafts';

const draft: MonitoringReadingDraft = {
  mode: 'numeric',
  notes: 'Revisar acceso',
  numericValue: '2,40',
  potPosition: 'P-1',
  potScale: '20 kOhm',
  potUnit: 'kOhm',
  potValues: {
    'blue-brown': '3.2',
    'yellow-blue': '1.1',
    'yellow-brown': '2.4'
  },
  textValue: '',
  unit: 'mm'
};

describe('monitoring reading drafts', () => {
  beforeEach(async () => {
    await applyMigrations();
    getDatabase().runSync('DELETE FROM monitoring_reading_drafts');
  });

  afterAll(() => {
    closeDatabase();
  });

  it('keeps drafts isolated by session and round point', () => {
    saveMonitoringReadingDraft('session-a', 'point-1', draft, '2026-09-12T10:00:00.000Z');

    expect(getMonitoringReadingDraft('session-a', 'point-1')).toEqual({
      draft,
      updatedAt: '2026-09-12T10:00:00.000Z'
    });
    expect(getMonitoringReadingDraft('session-b', 'point-1')).toBeNull();
    expect(getMonitoringReadingDraft('session-a', 'point-2')).toBeNull();
  });

  it('replaces and clears one draft without touching another session', () => {
    saveMonitoringReadingDraft('session-a', 'point-1', draft);
    saveMonitoringReadingDraft('session-b', 'point-1', { ...draft, notes: 'Otra cuenta' });
    saveMonitoringReadingDraft('session-a', 'point-1', { ...draft, notes: 'Actualizado' });

    expect(getMonitoringReadingDraft('session-a', 'point-1')?.draft.notes).toBe('Actualizado');
    clearMonitoringReadingDraft('session-a', 'point-1');
    expect(getMonitoringReadingDraft('session-a', 'point-1')).toBeNull();
    expect(getMonitoringReadingDraft('session-b', 'point-1')?.draft.notes).toBe('Otra cuenta');
  });
});
