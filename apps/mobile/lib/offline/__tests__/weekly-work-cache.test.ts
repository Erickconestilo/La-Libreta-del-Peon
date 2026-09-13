import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import type { WeeklyWorkItem } from '../../weekly-work';
import { applyMigrations, closeDatabase, getDatabase } from '../database';
import { getWeeklyWorkCache, saveWeeklyWorkCache } from '../weekly-work-cache';

const work: WeeklyWorkItem = {
  category: 'leveling',
  completedAt: null,
  createdAt: '2026-09-14T07:00:00.000Z',
  createdBy: 'user-1',
  id: 'work-1',
  notes: 'Prioridad de mañana',
  projectId: 'project-1',
  status: 'planned',
  title: 'Nivelación acceso norte',
  updatedAt: '2026-09-14T07:00:00.000Z',
  version: 1,
  workDate: '2026-09-14'
};

describe('Weekly work cache', () => {
  beforeEach(async () => {
    await applyMigrations();
    getDatabase().runSync('DELETE FROM weekly_work_cache');
  });

  afterEach(() => closeDatabase());

  it('persists a week by session and project', () => {
    saveWeeklyWorkCache('session:one', 'project-1', '2026-09-14', [work], '2026-09-14T08:00:00.000Z');
    expect(getWeeklyWorkCache('session:one', 'project-1', '2026-09-14')).toEqual({
      cachedAt: '2026-09-14T08:00:00.000Z',
      items: [work]
    });
    expect(getWeeklyWorkCache('session:two', 'project-1', '2026-09-14')).toBeNull();
    expect(getWeeklyWorkCache('session:one', 'project-2', '2026-09-14')).toBeNull();
  });

  it('updates the same cached week without duplicates', () => {
    saveWeeklyWorkCache('session:one', 'project-1', '2026-09-14', [work]);
    saveWeeklyWorkCache('session:one', 'project-1', '2026-09-14', [{ ...work, title: 'Actualizado' }]);
    expect(getWeeklyWorkCache('session:one', 'project-1', '2026-09-14')?.items).toEqual([
      { ...work, title: 'Actualizado' }
    ]);
  });
});
