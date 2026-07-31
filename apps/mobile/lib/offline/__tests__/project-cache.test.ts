import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import { applyMigrations, closeDatabase, getDatabase } from '../database';
import { getCachedProjectList, saveProjectList } from '../project-cache';

const project = {
  code: 'L8',
  createdAt: '2026-07-31T00:00:00.000Z',
  description: null,
  id: 'project-1',
  imageUrl: null,
  isActive: true,
  name: '***REMOVED***',
  stationCount: 4,
  updatedAt: '2026-07-31T00:00:00.000Z'
};

describe('Project list cache', () => {
  beforeEach(async () => {
    await applyMigrations();
    getDatabase().runSync('DELETE FROM project_list_cache');
  });

  afterEach(() => {
    closeDatabase();
  });

  it('persists the latest project list per local session', () => {
    saveProjectList('session:one', [project]);

    expect(getCachedProjectList('session:one')?.projects).toEqual([project]);
    expect(getCachedProjectList('session:two')).toBeNull();
  });

  it('updates an existing cache entry without duplicating it', () => {
    saveProjectList('guest', [project]);
    saveProjectList('guest', [{ ...project, name: '***REMOVED*** actualizada' }]);

    const cached = getCachedProjectList('guest');
    expect(cached?.projects).toHaveLength(1);
    expect(cached?.projects[0]?.name).toBe('***REMOVED*** actualizada');
  });
});
